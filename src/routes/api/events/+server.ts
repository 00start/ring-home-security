import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';
import type { EventType, EventFilters } from '$lib/types';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-events');

export const GET: RequestHandler = async ({ url }) => {
	try {
		const deviceId = url.searchParams.get('deviceId') ?? undefined;
		const eventType = url.searchParams.get('eventType') as EventType | undefined;
		const hasRecordingParam = url.searchParams.get('hasRecording');
		const hasRecording = hasRecordingParam ? hasRecordingParam === 'true' : undefined;
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
		const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

		const filters: EventFilters = {
			deviceId,
			eventType,
			hasRecording,
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			limit,
			offset
		};

		const events = eventsRepo.getEvents(filters);
		const total = eventsRepo.getEventsCount(filters);

		return json({
			success: true,
			data: events,
			total,
			page: Math.floor(offset / limit) + 1,
			limit
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get events');
		return json({ success: false, error: 'Failed to get events' }, { status: 500 });
	}
};
