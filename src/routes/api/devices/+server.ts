import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-devices');

export const GET: RequestHandler = async () => {
	try {
		const devices = devicesRepo.getAllDevices();

		return json({
			success: true,
			data: devices
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get devices');
		return json({ success: false, error: 'Failed to get devices' }, { status: 500 });
	}
};
