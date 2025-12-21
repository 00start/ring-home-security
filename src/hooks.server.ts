import type { Handle } from '@sveltejs/kit';
import { ensureDatabase } from '$lib/server/db';
import { validateSession } from '$lib/server/auth';
import { authRepo } from '$lib/db';

// Initialize database on first request
let dbInitialized = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize database
	if (!dbInitialized) {
		await ensureDatabase();
		await authRepo.ensureDefaultUser();
		dbInitialized = true;
	}

	// Check authentication for protected routes
	const auth = validateSession(event.cookies);
	event.locals.user = auth?.user ?? null;
	event.locals.session = auth?.session ?? null;

	// Protect routes (except login and API auth)
	const isPublicRoute =
		event.url.pathname === '/login' ||
		event.url.pathname.startsWith('/api/auth');

	if (!isPublicRoute && !auth) {
		// Redirect to login for page requests
		if (!event.url.pathname.startsWith('/api/')) {
			return new Response(null, {
				status: 302,
				headers: { Location: '/login' }
			});
		}

		// Return 401 for API requests
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return resolve(event);
};
