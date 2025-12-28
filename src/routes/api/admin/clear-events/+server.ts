import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-admin');

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const deleted = eventsRepo.deleteAllEvents();
		return json({
			success: true,
			data: { deleted }
		});
	} catch (error) {
		logger.error({ error }, 'Failed to clear events');
		return json({ success: false, error: 'Failed to clear events' }, { status: 500 });
	}
};
