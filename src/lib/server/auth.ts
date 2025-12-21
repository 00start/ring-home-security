/**
 * Authentication helpers for SvelteKit
 */
import type { Cookies } from '@sveltejs/kit';
import { authRepo } from '$lib/db';
import type { User, Session } from '$lib/types';

const SESSION_COOKIE_NAME = 'session';

export function getSessionId(cookies: Cookies): string | null {
	return cookies.get(SESSION_COOKIE_NAME) ?? null;
}

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 60 * 60 * 24 * 7 // 1 week
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

export function validateSession(cookies: Cookies): { user: User; session: Session } | null {
	const sessionId = getSessionId(cookies);
	console.log('[VALIDATE_SESSION] Session ID from cookie:', sessionId);
	if (!sessionId) return null;

	const session = authRepo.getSession(sessionId);
	console.log('[VALIDATE_SESSION] Session found:', !!session);
	if (!session) return null;

	const user = authRepo.getUserById(session.userId);
	console.log('[VALIDATE_SESSION] User found:', !!user);
	if (!user) {
		authRepo.deleteSession(sessionId);
		return null;
	}

	return { user, session };
}

export async function login(
	username: string,
	password: string,
	cookies: Cookies
): Promise<User | null> {
	const user = await authRepo.validatePassword(username, password);
	if (!user) return null;

	const session = authRepo.createSession(user.id);
	setSessionCookie(cookies, session.id);

	return user;
}

export function logout(cookies: Cookies): void {
	const sessionId = getSessionId(cookies);
	if (sessionId) {
		authRepo.deleteSession(sessionId);
	}
	clearSessionCookie(cookies);
}
