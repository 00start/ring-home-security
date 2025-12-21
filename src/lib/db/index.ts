export { getDatabase, initDatabase, closeDatabase } from './client';

// Re-export all repositories
export * as devicesRepo from './repositories/devices';
export * as eventsRepo from './repositories/events';
export * as recordingsRepo from './repositories/recordings';
export * as authRepo from './repositories/auth';
export * as tokensRepo from './repositories/tokens';
