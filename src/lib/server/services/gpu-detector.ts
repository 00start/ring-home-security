/**
 * GPU Capability Detection Service
 *
 * Detects available hardware encoders (NVENC, VAAPI, VideoToolbox)
 * and provides the optimal encoder selection for video transcoding.
 *
 * @module gpu-detector
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '$lib/utils/logger.server.js';

const execAsync = promisify(exec);

/**
 * GPU Capabilities Interface
 * Represents the detected hardware acceleration capabilities
 */
export interface GPUCapabilities {
	/** NVIDIA NVENC hardware encoder available */
	hasNVENC: boolean;
	/** Intel VAAPI hardware encoder available */
	hasVAAPI: boolean;
	/** Apple VideoToolbox hardware encoder available (macOS) */
	hasVideoToolbox: boolean;
	/** Recommended encoder based on available hardware */
	preferredEncoder: 'h264_nvenc' | 'h264_vaapi' | 'h264_videotoolbox' | 'libx264';
}

/**
 * In-memory cache for GPU capabilities
 * Detection is expensive, so we cache the results
 */
let capabilitiesCache: GPUCapabilities | null = null;

/**
 * Detects NVIDIA NVENC support
 * Checks for nvidia-smi and ffmpeg NVENC encoder support
 */
async function detectNVENC(): Promise<boolean> {
	try {
		// Check for NVIDIA GPU using nvidia-smi
		await execAsync('nvidia-smi --query-gpu=name --format=csv,noheader');

		// Verify ffmpeg has nvenc support
		const { stdout } = await execAsync('ffmpeg -hide_banner -encoders');
		return stdout.includes('h264_nvenc');
	} catch (error) {
		// nvidia-smi not found or ffmpeg doesn't support nvenc
		return false;
	}
}

/**
 * Detects Intel VAAPI support
 * Checks for /dev/dri/renderD* devices and ffmpeg VAAPI encoder support
 */
async function detectVAAPI(): Promise<boolean> {
	try {
		// Check for Intel GPU render device
		await execAsync('ls /dev/dri/renderD* 2>/dev/null');

		// Verify ffmpeg has vaapi support
		const { stdout } = await execAsync('ffmpeg -hide_banner -encoders');
		return stdout.includes('h264_vaapi');
	} catch (error) {
		// No render device or ffmpeg doesn't support vaapi
		return false;
	}
}

/**
 * Detects Apple VideoToolbox support
 * Only available on macOS with ffmpeg VideoToolbox support
 */
async function detectVideoToolbox(): Promise<boolean> {
	try {
		// Check if running on macOS
		const platform = process.platform;
		if (platform !== 'darwin') {
			return false;
		}

		// Verify ffmpeg has videotoolbox support
		const { stdout } = await execAsync('ffmpeg -hide_banner -encoders');
		return stdout.includes('h264_videotoolbox');
	} catch (error) {
		// Not macOS or ffmpeg doesn't support videotoolbox
		return false;
	}
}

/**
 * Determines the preferred encoder based on available hardware
 * Priority: NVENC > VAAPI > VideoToolbox > libx264 (software)
 *
 * @param hasNVENC - NVENC availability
 * @param hasVAAPI - VAAPI availability
 * @param hasVideoToolbox - VideoToolbox availability
 * @returns Preferred encoder name
 */
function selectPreferredEncoder(
	hasNVENC: boolean,
	hasVAAPI: boolean,
	hasVideoToolbox: boolean
): GPUCapabilities['preferredEncoder'] {
	// On macOS, prefer VideoToolbox as it's native
	if (process.platform === 'darwin' && hasVideoToolbox) {
		return 'h264_videotoolbox';
	}

	// NVENC has best performance/quality ratio
	if (hasNVENC) {
		return 'h264_nvenc';
	}

	// VAAPI is good for Intel GPUs
	if (hasVAAPI) {
		return 'h264_vaapi';
	}

	// Non-macOS VideoToolbox (shouldn't happen but handle it)
	if (hasVideoToolbox) {
		return 'h264_videotoolbox';
	}

	// Fallback to software encoding
	return 'libx264';
}

/**
 * Detects all available GPU capabilities
 * Results are cached after first detection
 *
 * @returns GPU capabilities including preferred encoder
 */
export async function detectGPU(): Promise<GPUCapabilities> {
	// Return cached result if available
	if (capabilitiesCache) {
		logger.debug('Returning cached GPU capabilities');
		return capabilitiesCache;
	}

	logger.info('Detecting GPU capabilities...');

	try {
		// Run all detection in parallel for speed
		const [hasNVENC, hasVAAPI, hasVideoToolbox] = await Promise.all([
			detectNVENC(),
			detectVAAPI(),
			detectVideoToolbox()
		]);

		const capabilities: GPUCapabilities = {
			hasNVENC,
			hasVAAPI,
			hasVideoToolbox,
			preferredEncoder: selectPreferredEncoder(hasNVENC, hasVAAPI, hasVideoToolbox)
		};

		// Cache the results
		capabilitiesCache = capabilities;

		logger.info(
			{
				hasNVENC,
				hasVAAPI,
				hasVideoToolbox,
				preferredEncoder: capabilities.preferredEncoder
			},
			'GPU detection complete'
		);

		return capabilities;
	} catch (error) {
		// If detection fails, fall back to software encoding
		logger.error({ error }, 'GPU detection failed, falling back to software encoding');

		const fallbackCapabilities: GPUCapabilities = {
			hasNVENC: false,
			hasVAAPI: false,
			hasVideoToolbox: false,
			preferredEncoder: 'libx264'
		};

		capabilitiesCache = fallbackCapabilities;
		return fallbackCapabilities;
	}
}

/**
 * Gets the preferred encoder name
 * Convenience function that runs detection if needed
 *
 * @returns Encoder name string
 */
export async function getPreferredEncoder(): Promise<string> {
	const capabilities = await detectGPU();
	return capabilities.preferredEncoder;
}

/**
 * Clears the GPU capabilities cache
 * Useful for testing or forcing re-detection
 */
export function clearCache(): void {
	capabilitiesCache = null;
	logger.debug('GPU capabilities cache cleared');
}

/**
 * Gets cached capabilities without running detection
 *
 * @returns Cached capabilities or null if not yet detected
 */
export function getCachedCapabilities(): GPUCapabilities | null {
	return capabilitiesCache;
}
