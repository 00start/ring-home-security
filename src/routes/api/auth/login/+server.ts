import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { login } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		console.log('[LOGIN] Attempt:', { username, passwordLength: password?.length });

		if (!username || !password) {
			console.log('[LOGIN] Missing credentials');
			return json({ success: false, error: 'Username and password required' }, { status: 400 });
		}

		const user = await login(username, password, cookies);

		if (!user) {
			console.log('[LOGIN] Invalid credentials for username:', username);
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

		console.log('[LOGIN] Success for user:', username);

		return json({
			success: true,
			data: {
				id: user.id,
				username: user.username
			}
		});
	} catch (error) {
		console.error('Login error:', error);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
