import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';

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
		console.error('Failed to clear events:', error);
		return json({ success: false, error: 'Failed to clear events' }, { status: 500 });
	}
};
