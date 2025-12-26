/**
 * Camera Zones Module
 *
 * Manages zone-based recording where motion detected on edge/boundary
 * cameras triggers recording on all cameras within that zone.
 *
 * Zone Pattern:
 * - Edge cameras (boundaries) detect motion and trigger zone recording
 * - Inner cameras record when triggered by edge cameras in their zone
 * - Recording continues until no motion is detected for a configurable cooldown period
 */

import type { RingCamera } from 'ring-client-api';
import { createLogger } from './logger.server.js';
import { config } from '../config/index.js';

const logger = createLogger('camera-zones');

/**
 * Zone configuration - defines which cameras trigger which other cameras
 */
export interface CameraZone {
	name: string;
	// Camera names that can trigger this zone (edge/boundary cameras)
	triggerCameras: string[];
	// All cameras in this zone that should record when triggered
	recordCameras: string[];
	// Cooldown in seconds before stopping recording after last motion
	motionCooldownSeconds: number;
}

/**
 * Active zone recording state
 */
interface ZoneRecordingState {
	zoneName: string;
	isRecording: boolean;
	lastMotionTime: number;
	cooldownTimer: ReturnType<typeof setTimeout> | null;
	activeCameraIds: Set<string>;
}

/**
 * Default zone configuration
 * Can be overridden via environment variable CAMERA_ZONES (JSON)
 */
const DEFAULT_ZONES: CameraZone[] = [
	{
		name: 'front',
		triggerCameras: ['front walk', 'front alley', 'front elevation'],
		recordCameras: ['front walk', 'front alley', 'front elevation', 'front door'],
		motionCooldownSeconds: 7
	},
	{
		name: 'garden',
		triggerCameras: ['garden'],
		recordCameras: ['garden', 'kitchen'],
		motionCooldownSeconds: 7
	}
];

/**
 * Manages camera zones and zone-triggered recordings
 */
export class CameraZoneManager {
	private zones: CameraZone[] = [];
	private cameras: Map<string, RingCamera> = new Map();
	private cameraNameToId: Map<string, string> = new Map();
	private cameraIdToName: Map<string, string> = new Map();
	private zoneStates: Map<string, ZoneRecordingState> = new Map();
	private recordingCallback: ((camera: RingCamera, triggeredBy: string, zoneName: string) => Promise<void>) | null = null;

	constructor() {
		this.loadZoneConfiguration();
	}

	/**
	 * Load zone configuration from environment or use defaults
	 */
	private loadZoneConfiguration(): void {
		try {
			const zonesEnv = process.env.CAMERA_ZONES;
			if (zonesEnv) {
				this.zones = JSON.parse(zonesEnv);
				logger.info({ zoneCount: this.zones.length }, 'Loaded camera zones from environment');
			} else {
				this.zones = DEFAULT_ZONES;
				logger.info({ zoneCount: this.zones.length }, 'Using default camera zones');
			}

			// Log zone configuration
			for (const zone of this.zones) {
				logger.info({
					zoneName: zone.name,
					triggerCameras: zone.triggerCameras,
					recordCameras: zone.recordCameras,
					cooldownSeconds: zone.motionCooldownSeconds
				}, 'Zone configured');
			}
		} catch (error) {
			logger.error({ error }, 'Failed to parse CAMERA_ZONES, using defaults');
			this.zones = DEFAULT_ZONES;
		}
	}

	/**
	 * Initialize with available cameras
	 */
	initialize(cameras: RingCamera[]): void {
		this.cameras.clear();
		this.cameraNameToId.clear();
		this.cameraIdToName.clear();

		for (const camera of cameras) {
			const id = camera.id.toString();
			const name = camera.name.toLowerCase();

			this.cameras.set(id, camera);
			this.cameraNameToId.set(name, id);
			this.cameraIdToName.set(id, name);

			logger.debug({ cameraId: id, cameraName: name }, 'Registered camera');
		}

		// Initialize zone states
		for (const zone of this.zones) {
			this.zoneStates.set(zone.name, {
				zoneName: zone.name,
				isRecording: false,
				lastMotionTime: 0,
				cooldownTimer: null,
				activeCameraIds: new Set()
			});
		}

		logger.info({
			cameraCount: cameras.length,
			zoneCount: this.zones.length
		}, 'Camera zone manager initialized');
	}

	/**
	 * Set callback for when zone recording should start
	 */
	setRecordingCallback(callback: (camera: RingCamera, triggeredBy: string, zoneName: string) => Promise<void>): void {
		this.recordingCallback = callback;
	}

	/**
	 * Find which zones a camera belongs to as a trigger camera
	 */
	private findTriggerZones(cameraName: string): CameraZone[] {
		const normalizedName = cameraName.toLowerCase();
		return this.zones.filter(zone =>
			zone.triggerCameras.some(trigger =>
				normalizedName.includes(trigger.toLowerCase()) ||
				trigger.toLowerCase().includes(normalizedName)
			)
		);
	}

	/**
	 * Get camera by name (case-insensitive, partial match)
	 */
	private findCameraByName(name: string): RingCamera | undefined {
		const normalizedName = name.toLowerCase();

		// Try exact match first
		const exactId = this.cameraNameToId.get(normalizedName);
		if (exactId) {
			return this.cameras.get(exactId);
		}

		// Try partial match
		for (const [cameraName, cameraId] of this.cameraNameToId.entries()) {
			if (cameraName.includes(normalizedName) || normalizedName.includes(cameraName)) {
				return this.cameras.get(cameraId);
			}
		}

		return undefined;
	}

	/**
	 * Handle motion detected on a camera
	 * Returns true if this motion triggered zone recording
	 */
	async handleMotion(camera: RingCamera): Promise<{ triggered: boolean; zones: string[] }> {
		const cameraName = camera.name;
		const cameraId = camera.id.toString();
		const triggeredZones: string[] = [];

		// Find zones where this camera is a trigger
		const zones = this.findTriggerZones(cameraName);

		if (zones.length === 0) {
			logger.debug({ cameraName }, 'Camera is not a zone trigger, skipping zone recording');
			return { triggered: false, zones: [] };
		}

		for (const zone of zones) {
			const state = this.zoneStates.get(zone.name);
			if (!state) continue;

			// Update last motion time
			state.lastMotionTime = Date.now();

			// Clear any existing cooldown timer
			if (state.cooldownTimer) {
				clearTimeout(state.cooldownTimer);
				state.cooldownTimer = null;
			}

			logger.info({
				zoneName: zone.name,
				triggeredBy: cameraName,
				isAlreadyRecording: state.isRecording
			}, 'Zone motion detected');

			if (!state.isRecording) {
				// Start zone recording
				state.isRecording = true;
				triggeredZones.push(zone.name);

				// Trigger recording on all cameras in the zone
				await this.startZoneRecording(zone, cameraName, state);
			} else {
				// Zone already recording, just extend the cooldown
				logger.debug({ zoneName: zone.name }, 'Zone already recording, extending cooldown');
			}

			// Schedule cooldown check
			this.scheduleCooldownCheck(zone, state);
		}

		return { triggered: triggeredZones.length > 0, zones: triggeredZones };
	}

	/**
	 * Start recording on all cameras in a zone
	 */
	private async startZoneRecording(zone: CameraZone, triggeredBy: string, state: ZoneRecordingState): Promise<void> {
		logger.info({
			zoneName: zone.name,
			triggeredBy,
			cameras: zone.recordCameras
		}, 'Starting zone recording');

		const recordingPromises: Promise<void>[] = [];

		for (const cameraName of zone.recordCameras) {
			const camera = this.findCameraByName(cameraName);

			if (!camera) {
				logger.warn({ cameraName, zoneName: zone.name }, 'Zone camera not found');
				continue;
			}

			const cameraId = camera.id.toString();

			// Skip if already recording this camera
			if (state.activeCameraIds.has(cameraId)) {
				logger.debug({ cameraName, zoneName: zone.name }, 'Camera already recording in zone');
				continue;
			}

			state.activeCameraIds.add(cameraId);

			if (this.recordingCallback) {
				recordingPromises.push(
					this.recordingCallback(camera, triggeredBy, zone.name).catch(error => {
						logger.error({ error, cameraName, zoneName: zone.name }, 'Failed to start zone recording for camera');
					})
				);
			}
		}

		// Start all recordings in parallel
		await Promise.allSettled(recordingPromises);
	}

	/**
	 * Schedule a cooldown check for the zone
	 */
	private scheduleCooldownCheck(zone: CameraZone, state: ZoneRecordingState): void {
		const cooldownMs = zone.motionCooldownSeconds * 1000;

		state.cooldownTimer = setTimeout(() => {
			const timeSinceLastMotion = Date.now() - state.lastMotionTime;

			if (timeSinceLastMotion >= cooldownMs) {
				// Cooldown period passed with no new motion, stop zone recording
				logger.info({
					zoneName: zone.name,
					timeSinceLastMotion: (timeSinceLastMotion / 1000).toFixed(1)
				}, 'Zone cooldown expired, stopping zone recording');

				state.isRecording = false;
				state.activeCameraIds.clear();
				state.cooldownTimer = null;
			} else {
				// Motion detected during cooldown, reschedule
				const remainingCooldown = cooldownMs - timeSinceLastMotion;
				logger.debug({
					zoneName: zone.name,
					remainingSeconds: (remainingCooldown / 1000).toFixed(1)
				}, 'Motion during cooldown, rescheduling');

				this.scheduleCooldownCheck(zone, state);
			}
		}, cooldownMs);
	}

	/**
	 * Get zone status for all zones
	 */
	getStatus(): Record<string, { isRecording: boolean; activeCameras: string[]; lastMotion: number }> {
		const status: Record<string, { isRecording: boolean; activeCameras: string[]; lastMotion: number }> = {};

		for (const [zoneName, state] of this.zoneStates) {
			const activeCameras: string[] = [];
			for (const cameraId of state.activeCameraIds) {
				const name = this.cameraIdToName.get(cameraId);
				if (name) activeCameras.push(name);
			}

			status[zoneName] = {
				isRecording: state.isRecording,
				activeCameras,
				lastMotion: state.lastMotionTime
			};
		}

		return status;
	}

	/**
	 * Check if a camera is part of any zone
	 */
	isZoneCamera(cameraName: string): boolean {
		const normalizedName = cameraName.toLowerCase();
		return this.zones.some(zone =>
			zone.triggerCameras.some(t => normalizedName.includes(t.toLowerCase())) ||
			zone.recordCameras.some(r => normalizedName.includes(r.toLowerCase()))
		);
	}

	/**
	 * Shutdown and cleanup
	 */
	shutdown(): void {
		for (const state of this.zoneStates.values()) {
			if (state.cooldownTimer) {
				clearTimeout(state.cooldownTimer);
				state.cooldownTimer = null;
			}
			state.isRecording = false;
			state.activeCameraIds.clear();
		}
		logger.info('Camera zone manager shutdown');
	}
}

// Singleton instance
let zoneManager: CameraZoneManager | null = null;

export function getZoneManager(): CameraZoneManager {
	if (!zoneManager) {
		zoneManager = new CameraZoneManager();
	}
	return zoneManager;
}
