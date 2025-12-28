import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authRepo } from '$lib/db';
import { hash } from '@node-rs/argon2';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-auth-password');

const HASH_OPTIONS = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { currentPassword, newPassword } = await request.json();

		if (!currentPassword || !newPassword) {
			return json({ success: false, error: 'Current and new password required' }, { status: 400 });
		}

		// Validate current password
		const user = await authRepo.validatePassword(locals.user.username, currentPassword);
		if (!user) {
			return json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
		}

		// Update password (we need to add this function to auth repo)
		const newPasswordHash = await hash(newPassword, HASH_OPTIONS);

		// Update directly in database
		const { getDatabase } = await import('$lib/db');
		const db = getDatabase();
		db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(
			newPasswordHash,
			locals.user.id
		);

		return json({ success: true });
	} catch (error) {
		logger.error({ error }, 'Password change error');
		return json({ success: false, error: 'Failed to change password' }, { status: 500 });
	}
};
