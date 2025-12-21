import pino from 'pino';
import { config } from '$lib/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

// Ensure logs directory exists
const logsDir = config.logsPath || './data/logs';
if (!existsSync(logsDir)) {
	mkdirSync(logsDir, { recursive: true });
}

// Determine process type from environment or default to web
const processType = process.env.PROCESS_TYPE || 'web';

// Create process-specific logger
export const logger = pino({
	level: config.logLevel,
	transport: {
		targets: [
			// Console output with colors
			{
				target: 'pino-pretty',
				level: config.logLevel,
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
					ignore: 'pid,hostname'
				}
			},
			// File output for this specific process
			{
				target: 'pino/file',
				level: config.logLevel,
				options: {
					destination: join(logsDir, `${processType}.log`),
					mkdir: true
				}
			}
		]
	}
});

export function createLogger(name: string) {
	return logger.child({ name });
}
