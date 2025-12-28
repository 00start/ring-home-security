import { getDatabase } from '../client';

interface TokenRow {
	id: number;
	refresh_token: string;
	updated_at: string;
}

export function getRefreshToken(): string | null {
	const db = getDatabase();
	const row = db.prepare('SELECT refresh_token FROM ring_tokens WHERE id = 1').get() as
		| TokenRow
		| undefined;
	return row?.refresh_token ?? null;
}

export function saveRefreshToken(refreshToken: string): void {
	const db = getDatabase();
	db.prepare(
		`
        INSERT INTO ring_tokens (id, refresh_token, updated_at)
        VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            refresh_token = excluded.refresh_token,
            updated_at = datetime('now')
    `
	).run(refreshToken);
}

export function deleteRefreshToken(): void {
	const db = getDatabase();
	db.prepare('DELETE FROM ring_tokens WHERE id = 1').run();
}
