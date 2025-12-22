import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { login } from '$lib/server/auth';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-login');

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		logger.debug({ username }, 'Login attempt');

		if (!username || !password) {
			logger.debug({ username }, 'Missing credentials');
			return json({ success: false, error: 'Username and password required' }, { status: 400 });
		}

		const user = await login(username, password, cookies);

		if (!user) {
			logger.info({ username }, 'Invalid credentials');
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

		logger.info({ username }, 'Login successful');

		return json({
			success: true,
			data: {
				id: user.id,
				username: user.username
			}
		});
	} catch (error) {
		logger.error({ error }, 'Login error');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
