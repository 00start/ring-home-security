import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { login } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ success: false, error: 'Username and password required' }, { status: 400 });
		}

		const user = await login(username, password, cookies);

		if (!user) {
			return json({ success: false, error: 'Invalid credentials' }, { status: 401 });
		}

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
