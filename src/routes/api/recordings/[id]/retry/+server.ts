import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo, eventsRepo } from '$lib/db';
import { getCameras } from '$lib/ring';
import { addTranscodeJob } from '$lib/queue';
import type { TranscodeJobData } from '$lib/types';
import { createLogger } from '$lib/utils/logger.server';
import { retry } from '$lib/utils';

const logger = createLogger('retry-recording');

export const POST: RequestHandler = async ({ params }) => {
	try {
		const recording = recordingsRepo.getRecordingById(params.id);

		if (!recording) {
			return json({ success: false, error: 'Recording not found' }, { status: 404 });
		}

		if (recording.status !== 'failed' && recording.status !== 'pending') {
			return json({ success: false, error: 'Only failed or pending recordings can be retried' }, { status: 400 });
		}

		const event = eventsRepo.getEventById(recording.eventId);
		if (!event) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		// Extract ding ID from metadata
		const dingId = event.metadata?.notificationId as string;
		if (!dingId) {
			return json({ success: false, error: 'No notification ID found for this event' }, { status: 400 });
		}

		// Update status to processing
		recordingsRepo.updateRecordingStatus(recording.id, 'processing');

		// Find the camera
		const cameras = await getCameras();
		const camera = cameras.find(c => c.id.toString() === recording.deviceId);

		if (!camera) {
			recordingsRepo.updateRecordingStatus(recording.id, 'failed');
			return json({ success: false, error: 'Camera not found' }, { status: 404 });
		}

		// Try to get the recording URL with retries (up to 2 minutes)
		logger.info({ dingId, cameraId: camera.id }, 'Attempting to fetch recording URL for retry');

		const recordingUrl = await retry(
			async () => {
				logger.debug({ dingId }, 'Retry attempt to get recording URL');
				const url = await camera.getRecordingUrl(dingId);
				if (!url) {
					throw new Error('Recording not yet available');
				}
				logger.info({ dingId }, 'Successfully obtained recording URL on retry');
				return url;
			},
			{ maxRetries: 15, baseDelay: 4000, maxDelay: 8000 }
		).catch((err) => {
			logger.error({ error: err, dingId }, 'All retry attempts exhausted for manual retry');
			return null;
		});

		if (!recordingUrl) {
			recordingsRepo.updateRecordingStatus(recording.id, 'failed');
			return json({
				success: false,
				error: 'Recording URL not available. The video may have expired from Ring\'s servers.'
			}, { status: 404 });
		}

		// Enqueue transcode job
		const jobData: TranscodeJobData = {
			recordingId: recording.id,
			sourceUrl: recordingUrl,
			deviceId: recording.deviceId,
			eventId: recording.eventId,
			timestamp: event.timestamp.toISOString()
		};

		await addTranscodeJob(jobData);

		logger.info({ recordingId: recording.id }, 'Recording retry enqueued');

		return json({
			success: true,
			message: 'Recording retry initiated successfully'
		});
	} catch (error) {
		logger.error({ error, recordingId: params.id }, 'Failed to retry recording');
		return json({ success: false, error: 'Failed to retry recording' }, { status: 500 });
	}
};
