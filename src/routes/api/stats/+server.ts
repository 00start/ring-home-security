import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo, eventsRepo, recordingsRepo } from '$lib/db';
import type { DashboardStats } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		const stats: DashboardStats = {
			totalDevices: devicesRepo.getTotalDeviceCount(),
			onlineDevices: devicesRepo.getOnlineDeviceCount(),
			totalEventsToday: eventsRepo.getTodayEventsCount(),
			totalRecordings: recordingsRepo.getTotalRecordingsCount(),
			storageUsed: recordingsRepo.getTotalStorageUsed()
		};

		return json({
			success: true,
			data: stats
		});
	} catch (error) {
		console.error('Failed to get stats:', error);
		return json({ success: false, error: 'Failed to get stats' }, { status: 500 });
	}
};
