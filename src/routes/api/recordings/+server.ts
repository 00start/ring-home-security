import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';
import type { RecordingStatus } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const deviceId = url.searchParams.get('deviceId') ?? undefined;
		const status = url.searchParams.get('status') as RecordingStatus | undefined;
		const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
		const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

		const recordings = recordingsRepo.getRecordings({
			deviceId,
			status,
			limit,
			offset
		});

		return json({
			success: true,
			data: recordings
		});
	} catch (error) {
		console.error('Failed to get recordings:', error);
		return json({ success: false, error: 'Failed to get recordings' }, { status: 500 });
	}
};
