import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/health - Health check endpoint
export const GET: RequestHandler = async () => {
	return json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		services: {
			web: 'running',
			database: 'not_configured',
			redis: 'not_configured',
			ringListener: 'not_started',
			transcodeWorker: 'not_started'
		}
	});
};
