import type { Handle } from '@sveltejs/kit';
import { ensureDatabase } from '$lib/server/db';
import { validateSession } from '$lib/server/auth';
import { authRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('hooks');

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
	logger.debug({ path: event.url.pathname, authenticated: !!auth }, 'Request authentication check');
	event.locals.user = auth?.user ?? null;
	event.locals.session = auth?.session ?? null;

	// Protect routes (except login and API auth login/logout)
	const isPublicRoute =
		event.url.pathname === '/login' ||
		event.url.pathname === '/api/auth/login' ||
		event.url.pathname === '/api/auth/logout';

	if (!isPublicRoute && !auth) {
		logger.debug({ path: event.url.pathname }, 'Unauthorized access, redirecting to login');
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
