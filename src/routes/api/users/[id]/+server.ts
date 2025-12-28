import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-user');

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	const { id } = params;

	// Prevent deleting yourself
	if (id === locals.user.id) {
		return json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
	}

	try {
		// Check if user exists
		const user = authRepo.getUserById(id);
		if (!user) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Check if this is the last user
		const userCount = authRepo.getUserCount();
		if (userCount <= 1) {
			return json({ success: false, error: 'Cannot delete the last user' }, { status: 400 });
		}

		const deleted = authRepo.deleteUser(id);

		if (deleted) {
			return json({ success: true });
		} else {
			return json({ success: false, error: 'Failed to delete user' }, { status: 500 });
		}
	} catch (error) {
		logger.error({ error, userId: id }, 'Failed to delete user');
		return json({ success: false, error: 'Failed to delete user' }, { status: 500 });
	}
};
