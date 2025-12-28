/**
 * Camera Buffer Module
 *
 * Provides continuous video buffering for Ring cameras to capture
 * pre-event footage. Each camera maintains a circular buffer of
 * the last N seconds of video data in memory.
 */

import type { RingCamera } from 'ring-client-api';
import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { config } from '../config/index.js';
import { createLogger } from './logger.server.js';
import { ensureDir } from './paths.js';
import { sleep } from './index.js';

const logger = createLogger('camera-buffer');

interface BufferChunk {
	data: Buffer;
	timestamp: number;
}

/**
 * Circular buffer that maintains the last N seconds of video data
 */
export class CircularBuffer {
	private chunks: BufferChunk[] = [];
	private maxAgeMs: number;

	constructor(maxAgeSeconds: number) {
		this.maxAgeMs = maxAgeSeconds * 1000;
	}

	/**
	 * Add a new chunk and prune old entries
	 */
	push(data: Buffer): void {
		const now = Date.now();
		this.chunks.push({ data, timestamp: now });
		this.prune(now);
	}

	/**
	 * Remove chunks older than maxAge
	 */
	private prune(now: number): void {
		const cutoff = now - this.maxAgeMs;
		// Find first chunk that's within the time window
		const firstValidIndex = this.chunks.findIndex((chunk) => chunk.timestamp >= cutoff);
		if (firstValidIndex > 0) {
			this.chunks = this.chunks.slice(firstValidIndex);
		} else if (firstValidIndex === -1) {
			// All chunks are too old
			this.chunks = [];
		}
	}

	/**
	 * Get all buffered data as a single Buffer
	 */
	getBufferedData(): Buffer {
		if (this.chunks.length === 0) {
			return Buffer.alloc(0);
		}
		return Buffer.concat(this.chunks.map((c) => c.data));
	}

	/**
	 * Get the duration of buffered data in seconds
	 */
	getBufferedDuration(): number {
		if (this.chunks.length < 2) return 0;
		const oldest = this.chunks[0].timestamp;
		const newest = this.chunks[this.chunks.length - 1].timestamp;
		return (newest - oldest) / 1000;
	}

	/**
	 * Get buffer size in bytes
	 */
	getSize(): number {
		return this.chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
	}

	/**
	 * Clear all buffered data
	 */
	clear(): void {
		this.chunks = [];
	}
}

type StreamSession = Awaited<ReturnType<RingCamera['streamVideo']>>;

/**
 * Manages the video buffer for a single camera
 */
export class CameraBuffer {
	readonly cameraId: string;
	readonly cameraName: string;
	private camera: RingCamera;
	private buffer: CircularBuffer;
	private streamSession: StreamSession | null = null;
	private isActive = false;
	private isCapturing = false;
	private reconnectAttempts = 0;
	private shouldReconnect = true;
	private isPausedForBattery = false;
	private batteryLevel: number | null = null;

	constructor(camera: RingCamera) {
		this.camera = camera;
		this.cameraId = camera.id.toString();
		this.cameraName = camera.name;
		this.batteryLevel = camera.batteryLevel ?? null;

		// Total buffer time = pre-event + latency compensation + safety margin
		const totalBufferSeconds =
			config.bufferPreEventSeconds +
			config.bufferLatencyCompensationSeconds +
			config.bufferSafetyMarginSeconds;

		this.buffer = new CircularBuffer(totalBufferSeconds);

		// Subscribe to battery level updates
		if (camera.onBatteryLevel) {
			camera.onBatteryLevel.subscribe({
				next: (level) => {
					if (level !== undefined && level !== null) {
						this.handleBatteryUpdate(level);
					}
				}
			});
		}
	}

	/**
	 * Handle battery level updates and pause/resume buffering accordingly
	 */
	private handleBatteryUpdate(level: number): void {
		const previousLevel = this.batteryLevel;
		this.batteryLevel = level;

		const threshold = config.batteryLowThreshold;
		if (threshold <= 0) return; // Battery optimization disabled

		const wasLow = previousLevel !== null && previousLevel < threshold;
		const isLow = level < threshold;

		if (isLow && !wasLow && this.isActive) {
			// Battery dropped below threshold, pause streaming
			logger.info(
				{ cameraId: this.cameraId, batteryLevel: level, threshold },
				'Battery low - pausing buffer stream to conserve power'
			);
			this.isPausedForBattery = true;
			this.stop();
		} else if (!isLow && wasLow && this.isPausedForBattery && config.bufferEnabled) {
			// Battery recovered above threshold, resume if buffering is enabled
			logger.info(
				{ cameraId: this.cameraId, batteryLevel: level, threshold },
				'Battery recovered - resuming buffer stream'
			);
			this.isPausedForBattery = false;
			this.start();
		}
	}

	/**
	 * Check if buffering should be active based on battery level
	 */
	private shouldBuffer(): boolean {
		if (!config.bufferEnabled) {
			return false;
		}

		const threshold = config.batteryLowThreshold;
		if (threshold > 0 && this.batteryLevel !== null && this.batteryLevel < threshold) {
			return false;
		}

		return true;
	}

	/**
	 * Start the continuous buffer stream
	 */
	async start(): Promise<void> {
		if (this.isActive) {
			logger.warn({ cameraId: this.cameraId }, 'Buffer already active');
			return;
		}

		if (!this.shouldBuffer()) {
			logger.info(
				{
					cameraId: this.cameraId,
					bufferEnabled: config.bufferEnabled,
					batteryLevel: this.batteryLevel,
					threshold: config.batteryLowThreshold
				},
				'Buffer not started - disabled or battery too low'
			);
			return;
		}

		this.shouldReconnect = true;
		await this.startStream();
	}

	private async startStream(): Promise<void> {
		try {
			this.isActive = true;
			logger.info(
				{ cameraId: this.cameraId, cameraName: this.cameraName },
				'Starting buffer stream'
			);

			this.streamSession = await this.camera.streamVideo({
				output: [
					'-f',
					'mpegts',
					'-codec:v',
					'libx264',
					'-preset',
					'ultrafast',
					'-tune',
					'zerolatency',
					'-profile:v',
					'baseline',
					'-level',
					'3.0',
					'-pix_fmt',
					'yuv420p',
					'-g',
					'30',
					'-codec:a',
					'aac',
					'-ar',
					'44100',
					'-ac',
					'2',
					'pipe:1'
				],
				stdoutCallback: (data: Buffer) => {
					if (data.length > 0) {
						this.buffer.push(data);
					}
				}
			});

			this.reconnectAttempts = 0;
			logger.info(
				{ cameraId: this.cameraId, cameraName: this.cameraName },
				'Buffer stream started successfully'
			);

			// Handle stream end
			this.streamSession.onCallEnded.subscribe(() => {
				logger.info({ cameraId: this.cameraId }, 'Buffer stream ended');
				this.isActive = false;
				this.streamSession = null;

				if (this.shouldReconnect && !this.isCapturing) {
					this.scheduleReconnect();
				}
			});
		} catch (error) {
			logger.error({ error, cameraId: this.cameraId }, 'Failed to start buffer stream');
			this.isActive = false;
			this.streamSession = null;

			if (this.shouldReconnect) {
				this.scheduleReconnect();
			}
		}
	}

	private scheduleReconnect(): void {
		// Don't reconnect if battery is low or buffering is disabled
		if (!this.shouldBuffer()) {
			logger.info(
				{ cameraId: this.cameraId, batteryLevel: this.batteryLevel },
				'Skipping reconnect - buffering disabled or battery low'
			);
			return;
		}

		const delay = Math.min(
			config.bufferReconnectDelayMs * Math.pow(2, this.reconnectAttempts),
			config.bufferMaxReconnectDelayMs
		);

		this.reconnectAttempts++;
		logger.info(
			{ cameraId: this.cameraId, delay, attempt: this.reconnectAttempts },
			'Scheduling buffer reconnect'
		);

		setTimeout(async () => {
			if (this.shouldReconnect && !this.isActive && this.shouldBuffer()) {
				await this.startStream();
			}
		}, delay);
	}

	/**
	 * Stop the buffer stream
	 */
	stop(): void {
		this.shouldReconnect = false;
		if (this.streamSession) {
			try {
				this.streamSession.stop();
			} catch (e) {
				// Ignore errors during stop
			}
			this.streamSession = null;
		}
		this.isActive = false;
		this.buffer.clear();
		logger.info({ cameraId: this.cameraId }, 'Buffer stopped');
	}

	/**
	 * Get buffer status
	 */
	getStatus(): {
		isActive: boolean;
		isCapturing: boolean;
		bufferDuration: number;
		bufferSize: number;
		batteryLevel: number | null;
		isPausedForBattery: boolean;
		bufferEnabled: boolean;
	} {
		return {
			isActive: this.isActive,
			isCapturing: this.isCapturing,
			bufferDuration: this.buffer.getBufferedDuration(),
			bufferSize: this.buffer.getSize(),
			batteryLevel: this.batteryLevel,
			isPausedForBattery: this.isPausedForBattery,
			bufferEnabled: config.bufferEnabled
		};
	}

	/**
	 * Capture an event recording with pre-buffered footage
	 */
	async captureEventRecording(eventId: string, outputPath: string): Promise<boolean> {
		if (this.isCapturing) {
			logger.warn({ cameraId: this.cameraId, eventId }, 'Already capturing, skipping');
			return false;
		}

		this.isCapturing = true;
		const tempDir = join(config.recordingsPath, 'temp');
		const preEventPath = join(tempDir, `${eventId}_pre.ts`);
		const postEventPath = join(tempDir, `${eventId}_post.ts`);

		try {
			await ensureDir(preEventPath);

			// Step 1: Get the pre-event buffer and write to temp file
			const preEventData = this.buffer.getBufferedData();
			const preEventDuration = this.buffer.getBufferedDuration();

			if (preEventData.length > 0) {
				await writeFile(preEventPath, preEventData);
				logger.info(
					{
						cameraId: this.cameraId,
						eventId,
						preEventDuration: preEventDuration.toFixed(1),
						preEventSize: preEventData.length
					},
					'Pre-event buffer saved'
				);
			} else {
				logger.warn({ cameraId: this.cameraId, eventId }, 'No pre-event buffer available');
			}

			// Step 2: Record post-event footage
			// Temporarily stop the buffer stream to avoid conflicts
			const wasActive = this.isActive;
			if (this.streamSession) {
				this.streamSession.stop();
				this.streamSession = null;
				this.isActive = false;
			}

			await this.recordPostEvent(postEventPath);

			// Step 3: Concatenate pre and post event footage
			await this.concatenateRecordings(
				preEventPath,
				postEventPath,
				outputPath,
				preEventData.length > 0
			);

			logger.info({ cameraId: this.cameraId, eventId, outputPath }, 'Event recording completed');

			// Resume buffer stream if it was active
			if (wasActive && this.shouldReconnect) {
				this.buffer.clear();
				await this.startStream();
			}

			return true;
		} catch (error) {
			logger.error(
				{ error, cameraId: this.cameraId, eventId },
				'Failed to capture event recording'
			);
			return false;
		} finally {
			this.isCapturing = false;

			// Cleanup temp files
			try {
				await unlink(preEventPath).catch(() => {});
				await unlink(postEventPath).catch(() => {});
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	private async recordPostEvent(outputPath: string): Promise<void> {
		return new Promise(async (resolve, reject) => {
			try {
				logger.info({ cameraId: this.cameraId }, 'Recording post-event footage');

				const postEventSession = await this.camera.streamVideo({
					output: [
						'-t',
						config.bufferPostEventSeconds.toString(),
						'-f',
						'mpegts',
						'-codec:v',
						'libx264',
						'-preset',
						'fast',
						'-profile:v',
						'baseline',
						'-level',
						'3.0',
						'-pix_fmt',
						'yuv420p',
						'-g',
						'30',
						'-codec:a',
						'aac',
						'-ar',
						'44100',
						'-ac',
						'2',
						outputPath
					]
				});

				// Wait for recording to complete
				const timeout = setTimeout(
					() => {
						postEventSession.stop();
					},
					(config.bufferPostEventSeconds + 10) * 1000
				);

				postEventSession.onCallEnded.subscribe(() => {
					clearTimeout(timeout);
					logger.info({ cameraId: this.cameraId }, 'Post-event recording completed');
					resolve();
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	private async concatenateRecordings(
		preEventPath: string,
		postEventPath: string,
		outputPath: string,
		hasPreEvent: boolean
	): Promise<void> {
		return new Promise((resolve, reject) => {
			let inputArg: string;

			if (hasPreEvent) {
				// Concatenate both files
				inputArg = `concat:${preEventPath}|${postEventPath}`;
			} else {
				// Only post-event
				inputArg = postEventPath;
			}

			const args = [
				'-i',
				inputArg,
				'-c',
				'copy',
				'-f',
				'mp4',
				'-movflags',
				'+faststart',
				'-y',
				outputPath
			];

			logger.info({ args }, 'Running ffmpeg concatenation');

			const ffmpeg = spawn('ffmpeg', args);
			let stderr = '';

			ffmpeg.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			ffmpeg.on('close', (code) => {
				if (code === 0) {
					resolve();
				} else {
					logger.error({ code, stderr }, 'FFmpeg concatenation failed');
					reject(new Error(`FFmpeg failed with code ${code}`));
				}
			});

			ffmpeg.on('error', (error) => {
				reject(error);
			});
		});
	}
}

/**
 * Manages video buffers for all cameras
 */
export class CameraBufferManager {
	private buffers: Map<string, CameraBuffer> = new Map();
	private initialized = false;

	/**
	 * Initialize buffers for all cameras with staggered startup
	 */
	async initialize(cameras: RingCamera[]): Promise<void> {
		if (this.initialized) {
			logger.warn('Buffer manager already initialized');
			return;
		}

		logger.info({ cameraCount: cameras.length }, 'Initializing camera buffer manager');

		for (let i = 0; i < cameras.length; i++) {
			const camera = cameras[i];

			// All devices from getCameras() are cameras, no need to filter
			logger.info({ cameraId: camera.id, name: camera.name }, 'Setting up buffer for camera');

			const buffer = new CameraBuffer(camera);
			this.buffers.set(camera.id.toString(), buffer);

			// Stagger startup to avoid overwhelming the system
			if (i > 0) {
				await sleep(2000);
			}

			try {
				await buffer.start();
			} catch (error) {
				logger.error({ error, cameraId: camera.id }, 'Failed to start buffer for camera');
				// Continue with other cameras
			}
		}

		this.initialized = true;
		logger.info({ activeBuffers: this.buffers.size }, 'Camera buffer manager initialized');
	}

	/**
	 * Get a camera's buffer by ID
	 */
	getBuffer(cameraId: string): CameraBuffer | undefined {
		return this.buffers.get(cameraId);
	}

	/**
	 * Get status of all buffers
	 */
	getStatus(): Record<string, ReturnType<CameraBuffer['getStatus']>> {
		const status: Record<string, ReturnType<CameraBuffer['getStatus']>> = {};
		for (const [id, buffer] of this.buffers) {
			status[id] = buffer.getStatus();
		}
		return status;
	}

	/**
	 * Shutdown all buffers gracefully
	 */
	shutdown(): void {
		logger.info('Shutting down camera buffer manager');
		for (const buffer of this.buffers.values()) {
			buffer.stop();
		}
		this.buffers.clear();
		this.initialized = false;
	}
}

// Singleton instance
let bufferManager: CameraBufferManager | null = null;

export function getBufferManager(): CameraBufferManager {
	if (!bufferManager) {
		bufferManager = new CameraBufferManager();
	}
	return bufferManager;
}
