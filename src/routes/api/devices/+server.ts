import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo } from '$lib/db';

export const GET: RequestHandler = async () => {
	try {
		const devices = devicesRepo.getAllDevices();

		return json({
			success: true,
			data: devices
		});
	} catch (error) {
		console.error('Failed to get devices:', error);
		return json({ success: false, error: 'Failed to get devices' }, { status: 500 });
	}
};
