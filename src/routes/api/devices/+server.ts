import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Device } from '$lib/types/index.js';

// GET /api/devices - List all devices
export const GET: RequestHandler = async () => {
	// TODO: Fetch devices from database
	const devices: Device[] = [];

	return json({
		success: true,
		data: devices
	});
};
