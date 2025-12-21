import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';
import type { EventType, EventFilters } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const deviceId = url.searchParams.get('deviceId') ?? undefined;
		const eventType = url.searchParams.get('eventType') as EventType | undefined;
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
		const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

		const filters: EventFilters = {
			deviceId,
			eventType,
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
		console.error('Failed to get events:', error);
		return json({ success: false, error: 'Failed to get events' }, { status: 500 });
	}
};
