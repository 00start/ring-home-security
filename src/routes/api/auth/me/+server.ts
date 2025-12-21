import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	return json({
		success: true,
		data: {
			id: locals.user.id,
			username: locals.user.username
		}
	});
};
