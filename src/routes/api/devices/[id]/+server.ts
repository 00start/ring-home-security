import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-device');

export const GET: RequestHandler = async ({ params }) => {
	try {
		const device = devicesRepo.getDeviceById(params.id);

		if (!device) {
			return json({ success: false, error: 'Device not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: device
		});
	} catch (error) {
		logger.error({ error, deviceId: params.id }, 'Failed to get device');
		return json({ success: false, error: 'Failed to get device' }, { status: 500 });
	}
};
