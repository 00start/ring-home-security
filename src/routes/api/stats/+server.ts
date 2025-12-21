import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { devicesRepo, eventsRepo, recordingsRepo } from '$lib/db';
import type { DashboardStats } from '$lib/types';

export const GET: RequestHandler = async () => {
	try {
		console.log('[STATS] Fetching stats...');
		console.log('[STATS] Getting total devices...');
		const totalDevices = devicesRepo.getTotalDeviceCount();
		console.log('[STATS] Total devices:', totalDevices);

		console.log('[STATS] Getting online devices...');
		const onlineDevices = devicesRepo.getOnlineDeviceCount();
		console.log('[STATS] Online devices:', onlineDevices);

		console.log('[STATS] Getting today events...');
		const totalEventsToday = eventsRepo.getTodayEventsCount();
		console.log('[STATS] Today events:', totalEventsToday);

		console.log('[STATS] Getting total recordings...');
		const totalRecordings = recordingsRepo.getTotalRecordingsCount();
		console.log('[STATS] Total recordings:', totalRecordings);

		console.log('[STATS] Getting storage used (including database and logs)...');
		const storageUsed = await recordingsRepo.getTotalStorageUsedWithSystemFiles();
		console.log('[STATS] Storage used:', storageUsed);

		const stats: DashboardStats = {
			totalDevices,
			onlineDevices,
			totalEventsToday,
			totalRecordings,
			storageUsed
		};

		console.log('[STATS] Stats compiled successfully:', stats);

		return json({
			success: true,
			data: stats
		});
	} catch (error) {
		console.error('Failed to get stats:', error);
		console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return json({ success: false, error: 'Failed to get stats' }, { status: 500 });
	}
};
