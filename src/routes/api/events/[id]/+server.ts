import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-event');

export const GET: RequestHandler = async ({ params }) => {
	try {
		const event = eventsRepo.getEventById(params.id);

		if (!event) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: event
		});
	} catch (error) {
		logger.error({ error, eventId: params.id }, 'Failed to get event');
		return json({ success: false, error: 'Failed to get event' }, { status: 500 });
	}
};
