import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const recording = recordingsRepo.getRecordingById(params.id);

		if (!recording) {
			return json({ success: false, error: 'Recording not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: recording
		});
	} catch (error) {
		console.error('Failed to get recording:', error);
		return json({ success: false, error: 'Failed to get recording' }, { status: 500 });
	}
};
