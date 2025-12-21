import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/auth - Login
export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json();
	const { username, password } = body;

	if (!username || !password) {
		throw error(400, 'Username and password are required');
	}

	// TODO: Validate credentials against database
	// TODO: Create session and set cookie

	return json({
		success: true,
		user: {
			id: 'placeholder',
			username
		}
	});
};

// DELETE /api/auth - Logout
export const DELETE: RequestHandler = async ({ cookies }) => {
	// TODO: Clear session cookie

	return json({
		success: true,
		message: 'Logged out'
	});
};
