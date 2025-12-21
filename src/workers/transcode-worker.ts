/**
 * Transcode Worker
 *
 * This worker processes video transcoding jobs from the Redis queue.
 * It downloads videos from Ring, transcodes them to H.264/MP4 using ffmpeg,
 * generates thumbnails, and updates the database.
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { spawn } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import type { Job } from 'bullmq';
import { initDatabase, recordingsRepo } from '../lib/db/index.js';
import { createTranscodeWorker, closeRedisConnection } from '../lib/queue/index.js';
import { config } from '../lib/config/index.js';
import { createLogger } from '../lib/utils/logger.server.js';
import { ensureDir, getThumbnailPath } from '../lib/utils/paths.js';
import type { TranscodeJobData, TranscodeJobResult } from '../lib/types/index.js';

const logger = createLogger('transcode-worker');

let isShuttingDown = false;

async function downloadVideo(url: string, outputPath: string): Promise<void> {
	await ensureDir(outputPath);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
	}

	const fileStream = createWriteStream(outputPath);
	const body = response.body;

	if (!body) {
		throw new Error('Response body is null');
	}

	// Use a simpler approach for Node.js fetch
	const reader = body.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	const buffer = Buffer.concat(chunks);
	await fs.writeFile(outputPath, buffer);

	logger.debug({ outputPath, size: buffer.length }, 'Video downloaded');
}

async function transcodeVideo(
	inputPath: string,
	outputPath: string
): Promise<{ duration: number; fileSize: number }> {
	await ensureDir(outputPath);

	const ffmpegPath = config.ffmpegPath || 'ffmpeg';

	return new Promise((resolve, reject) => {
		const args = [
			'-i', inputPath,
			'-c:v', 'libx264',
			'-preset', 'fast',
			'-crf', '23',
			'-c:a', 'aac',
			'-b:a', '128k',
			'-movflags', '+faststart',
			'-y',
			outputPath
		];

		logger.debug({ ffmpegPath, args }, 'Running ffmpeg');

		const ffmpeg = spawn(ffmpegPath, args);

		let stderr = '';

		ffmpeg.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		ffmpeg.on('close', async (code) => {
			if (code !== 0) {
				logger.error({ code, stderr }, 'FFmpeg failed');
				reject(new Error(`FFmpeg exited with code ${code}`));
				return;
			}

			try {
				const stats = await fs.stat(outputPath);
				const duration = parseDuration(stderr);

				resolve({
					duration,
					fileSize: stats.size
				});
			} catch (error) {
				reject(error);
			}
		});

		ffmpeg.on('error', (error) => {
			reject(error);
		});
	});
}

function parseDuration(ffmpegOutput: string): number {
	// Parse duration from ffmpeg output
	const durationMatch = ffmpegOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
	if (durationMatch) {
		const hours = parseInt(durationMatch[1], 10);
		const minutes = parseInt(durationMatch[2], 10);
		const seconds = parseInt(durationMatch[3], 10);
		return hours * 3600 + minutes * 60 + seconds;
	}
	return 0;
}

async function getVideoDuration(videoPath: string): Promise<number> {
	const ffprobePath = config.ffprobePath || 'ffprobe';

	return new Promise((resolve, reject) => {
		const args = [
			'-v', 'error',
			'-show_entries', 'format=duration',
			'-of', 'default=noprint_wrappers=1:nokey=1',
			videoPath
		];

		const ffprobe = spawn(ffprobePath, args);

		let stdout = '';
		let stderr = '';

		ffprobe.stdout.on('data', (data) => {
			stdout += data.toString();
		});

		ffprobe.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		ffprobe.on('close', (code) => {
			if (code !== 0) {
				logger.error({ code, stderr }, 'ffprobe failed');
				resolve(0); // Return 0 on error
				return;
			}

			const duration = parseFloat(stdout.trim());
			resolve(isNaN(duration) ? 0 : Math.floor(duration));
		});

		ffprobe.on('error', (error) => {
			logger.error({ error }, 'ffprobe error');
			resolve(0); // Return 0 on error
		});
	});
}

async function generateThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
	await ensureDir(thumbnailPath);

	const ffmpegPath = config.ffmpegPath || 'ffmpeg';

	return new Promise((resolve, reject) => {
		const args = [
			'-i', videoPath,
			'-ss', '00:00:01',
			'-vframes', '1',
			'-vf', 'scale=320:-1',
			'-y',
			thumbnailPath
		];

		const ffmpeg = spawn(ffmpegPath, args);

		ffmpeg.on('close', (code) => {
			if (code !== 0) {
				// Thumbnail generation is optional, don't fail the job
				logger.warn({ code, videoPath }, 'Thumbnail generation failed');
				resolve();
			} else {
				resolve();
			}
		});

		ffmpeg.on('error', (error) => {
			logger.warn({ error, videoPath }, 'Thumbnail generation error');
			resolve(); // Don't fail the job
		});
	});
}

async function processTranscodeJob(job: Job<TranscodeJobData>): Promise<TranscodeJobResult> {
	const { recordingId, sourceUrl, deviceId, eventId, timestamp } = job.data;

	logger.info({ recordingId, deviceId }, 'Processing transcode job');

	// Get recording from database
	const recording = recordingsRepo.getRecordingById(recordingId);
	if (!recording) {
		throw new Error(`Recording not found: ${recordingId}`);
	}

	const isLocalFile = !sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://');
	const tempPath = `/tmp/ring-${recordingId}.mp4`;
	const inputPath = isLocalFile ? sourceUrl : tempPath;
	const outputPath = recording.filePath;
	const thumbnailPath = getThumbnailPath(deviceId, new Date(timestamp));

	try {
		// Update status to processing
		recordingsRepo.updateRecordingStatus(recordingId, 'processing');

		// Download video from Ring if it's a URL, skip if it's already a local file
		if (isLocalFile) {
			logger.info({ recordingId, sourceUrl }, 'Using existing local file');
			await job.updateProgress(10);
		} else {
			logger.info({ recordingId, sourceUrl }, 'Downloading from URL');
			await job.updateProgress(10);
			await downloadVideo(sourceUrl, tempPath);
		}

		// Transcode video (or just copy if already in correct format)
		await job.updateProgress(30);
		let duration: number;
		let fileSize: number;

		if (isLocalFile && sourceUrl === outputPath) {
			// File is already in the final location, just get metadata
			logger.info({ recordingId }, 'File already in correct location, extracting metadata');
			const stats = await fs.stat(outputPath);
			fileSize = stats.size;

			// Get duration from ffprobe
			duration = await getVideoDuration(outputPath);
		} else {
			// Transcode video
			const result = await transcodeVideo(inputPath, outputPath);
			duration = result.duration;
			fileSize = result.fileSize;
		}

		// Generate thumbnail
		await job.updateProgress(80);
		await generateThumbnail(outputPath, thumbnailPath);

		// Clean up temp file if we downloaded
		if (!isLocalFile) {
			await fs.unlink(tempPath).catch(() => {});
		}

		// Update recording in database
		recordingsRepo.updateRecordingStatus(recordingId, 'completed', {
			thumbnailPath,
			duration,
			fileSize
		});

		await job.updateProgress(100);

		logger.info({ recordingId, duration, fileSize }, 'Transcode job completed');

		return {
			success: true,
			filePath: outputPath,
			thumbnailPath,
			duration,
			fileSize
		};
	} catch (error) {
		// Clean up temp file on error
		if (!isLocalFile) {
			await fs.unlink(tempPath).catch(() => {});
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error({ error: errorMessage, recordingId }, 'Transcode job failed');

		recordingsRepo.updateRecordingStatus(recordingId, 'failed');

		return {
			success: false,
			error: errorMessage
		};
	}
}

async function startWorker(): Promise<void> {
	logger.info('Starting transcode worker');

	// Initialize database
	await initDatabase();

	// Create worker
	const worker = createTranscodeWorker(processTranscodeJob);

	logger.info('Transcode worker started successfully');

	// Handle shutdown
	const shutdown = async () => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		logger.info('Shutting down transcode worker');
		await worker.close();
		await closeRedisConnection();
		process.exit(0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	// Keep the process running
	await worker.waitUntilReady();
}

startWorker().catch((error) => {
	logger.fatal({ error }, 'Fatal error in transcode worker');
	process.exit(1);
});
