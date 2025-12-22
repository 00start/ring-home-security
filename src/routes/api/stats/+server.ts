import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo, eventsRepo, recordingsRepo } from '$lib/db';
import type { DashboardStats } from '$lib/types';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-stats');

export const GET: RequestHandler = async () => {
	try {
		logger.debug('Fetching dashboard stats');

		const totalDevices = devicesRepo.getTotalDeviceCount();
		const onlineDevices = devicesRepo.getOnlineDeviceCount();
		const totalEventsToday = eventsRepo.getTodayEventsCount();
		const totalRecordings = recordingsRepo.getTotalRecordingsCount();
		const storageUsed = await recordingsRepo.getTotalStorageUsedWithSystemFiles();

		const stats: DashboardStats = {
			totalDevices,
			onlineDevices,
			totalEventsToday,
			totalRecordings,
			storageUsed
		};

		logger.debug({ stats }, 'Stats compiled successfully');

		return json({
			success: true,
			data: stats
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get stats');
		return json({ success: false, error: 'Failed to get stats' }, { status: 500 });
	}
};
