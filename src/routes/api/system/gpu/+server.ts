/**
 * GPU Capabilities API Endpoint
 *
 * Provides information about available hardware acceleration
 * for video transcoding.
 *
 * @module api/system/gpu
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { detectGPU, getCachedCapabilities } from '$lib/server/services/gpu-detector.js';

/**
 * GET /api/system/gpu
 *
 * Returns GPU capabilities and preferred encoder.
 * Uses cached results if available to avoid expensive re-detection.
 *
 * @returns {GPUCapabilities} GPU capabilities and preferred encoder
 *
 * @example
 * ```json
 * {
 *   "hasNVENC": true,
 *   "hasVAAPI": false,
 *   "hasVideoToolbox": false,
 *   "preferredEncoder": "h264_nvenc"
 * }
 * ```
 */
export const GET: RequestHandler = async () => {
	try {
		// Try to get cached capabilities first
		let capabilities = getCachedCapabilities();

		// If no cache, run detection
		if (!capabilities) {
			capabilities = await detectGPU();
		}

		return json(capabilities);
	} catch (error) {
		// If detection fails, return software fallback
		return json(
			{
				hasNVENC: false,
				hasVAAPI: false,
				hasVideoToolbox: false,
				preferredEncoder: 'libx264',
				error: 'GPU detection failed'
			},
			{ status: 500 }
		);
	}
};
