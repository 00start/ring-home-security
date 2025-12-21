import { v4 as uuidv4 } from 'uuid';
import { hash, verify } from '@node-rs/argon2';
import { getDatabase } from '../client';
import type { User, Session } from '$lib/types';

interface UserRow {
	id: string;
	username: string;
	password_hash: string;
	created_at: string;
}

interface SessionRow {
	id: string;
	user_id: string;
	expires_at: string;
	created_at: string;
}

// Password hashing configuration
const HASH_OPTIONS = {
	memoryCost: 19456,
	timeCost: 2,
	outputLen: 32,
	parallelism: 1
};

export async function createUser(username: string, password: string): Promise<User> {
	const db = getDatabase();
	const id = uuidv4();
	const passwordHash = await hash(password, HASH_OPTIONS);

	db.prepare(
		`
        INSERT INTO users (id, username, password_hash)
        VALUES (?, ?, ?)
    `
	).run(id, username, passwordHash);

	return {
		id,
		username,
		createdAt: new Date()
	};
}

export function getUserById(id: string): User | null {
	const db = getDatabase();
	const row = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id) as
		| UserRow
		| undefined;

	if (!row) return null;

	return {
		id: row.id,
		username: row.username,
		createdAt: new Date(row.created_at)
	};
}

export function getUserByUsername(username: string): UserRow | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
		| UserRow
		| undefined;
	return row ?? null;
}

export async function validatePassword(username: string, password: string): Promise<User | null> {
	const user = getUserByUsername(username);
	if (!user) return null;

	const isValid = await verify(user.password_hash, password, HASH_OPTIONS);
	if (!isValid) return null;

	return {
		id: user.id,
		username: user.username,
		createdAt: new Date(user.created_at)
	};
}

export function createSession(userId: string, expiresInHours: number = 24 * 7): Session {
	const db = getDatabase();
	const id = uuidv4();
	const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

	db.prepare(
		`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (?, ?, ?)
    `
	).run(id, userId, expiresAt.toISOString());

	return {
		id,
		userId,
		expiresAt
	};
}

export function getSession(id: string): Session | null {
	const db = getDatabase();
	const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;

	if (!row) return null;

	const session: Session = {
		id: row.id,
		userId: row.user_id,
		expiresAt: new Date(row.expires_at)
	};

	// Check if session is expired
	if (session.expiresAt < new Date()) {
		deleteSession(id);
		return null;
	}

	return session;
}

export function deleteSession(id: string): void {
	const db = getDatabase();
	db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteExpiredSessions(): number {
	const db = getDatabase();
	const result = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
	return result.changes;
}

export function getUserCount(): number {
	const db = getDatabase();
	const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
	return result.count;
}

export async function ensureDefaultUser(): Promise<void> {
	const count = getUserCount();
	if (count === 0) {
		// Create default admin user
		await createUser('admin', 'admin');
	}
}
