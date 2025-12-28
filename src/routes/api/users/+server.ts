import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-users');

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const users = authRepo.getAllUsers();
		return json({
			success: true,
			data: users.map((u) => ({
				id: u.id,
				username: u.username,
				createdAt: u.createdAt.toISOString()
			}))
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get users');
		return json({ success: false, error: 'Failed to get users' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { username, password } = await request.json();

		if (!username || typeof username !== 'string' || username.trim().length === 0) {
			return json({ success: false, error: 'Username is required' }, { status: 400 });
		}

		if (!password || typeof password !== 'string' || password.length < 8) {
			return json(
				{ success: false, error: 'Password must be at least 8 characters' },
				{ status: 400 }
			);
		}

		// Check if username already exists
		const existing = authRepo.getUserByUsername(username.trim());
		if (existing) {
			return json({ success: false, error: 'Username already exists' }, { status: 400 });
		}

		const user = await authRepo.createUser(username.trim(), password);

		return json({
			success: true,
			data: {
				id: user.id,
				username: user.username,
				createdAt: user.createdAt.toISOString()
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to create user');
		return json({ success: false, error: 'Failed to create user' }, { status: 500 });
	}
};
