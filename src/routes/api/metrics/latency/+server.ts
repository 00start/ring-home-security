/**
 * FTR-002: Zone Latency Metrics API
 * GET: Return latency stats for zone/time range
 * POST: Record latency measurements
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { latencyTracker } from '$lib/server/services/latency-tracker';
import type { TimeRange } from '$lib/server/services/latency-tracker';

interface RecordLatencyRequest {
	type: 'trigger' | 'follower_start';
	zoneId: string;
	cameraId: string;
	timestamp?: number;
}

/**
 * GET: Retrieve latency statistics for a zone
 * Query params:
 *   - zoneId: string (required)
 *   - startDate: ISO date string (optional, defaults to 24h ago)
 *   - endDate: ISO date string (optional, defaults to now)
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const zoneId = url.searchParams.get('zoneId');

		if (!zoneId) {
			return json({
				success: false,
				error: 'zoneId is required'
			}, { status: 400 });
		}

		// Parse time range
		const endDate = url.searchParams.get('endDate')
			? new Date(url.searchParams.get('endDate')!)
			: new Date();

		const startDate = url.searchParams.get('startDate')
			? new Date(url.searchParams.get('startDate')!)
			: new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

		const timeRange: TimeRange = {
			start: startDate,
			end: endDate
		};

		// Get statistics
		const stats = latencyTracker.getLatencyStats(zoneId, timeRange);
		const percentiles = latencyTracker.getPercentiles(zoneId, timeRange);

		return json({
			success: true,
			data: {
				zoneId,
				timeRange: {
					start: timeRange.start.toISOString(),
					end: timeRange.end.toISOString()
				},
				stats: {
					measurements: stats.measurements,
					min: stats.min,
					max: stats.max,
					avg: stats.avg,
					slaBreach: stats.slaBreach,
					slaThreshold: 500
				},
				percentiles: {
					p50: percentiles.p50,
					p95: percentiles.p95,
					p99: percentiles.p99
				}
			}
		});
	} catch (error) {
		console.error('Failed to get latency metrics:', error);
		return json({
			success: false,
			error: 'Failed to get latency metrics'
		}, { status: 500 });
	}
};

/**
 * POST: Record a latency measurement
 * Body:
 *   - type: 'trigger' | 'follower_start'
 *   - zoneId: string
 *   - cameraId: string
 *   - timestamp: number (optional, defaults to Date.now())
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json() as RecordLatencyRequest;
		const { type, zoneId, cameraId, timestamp = Date.now() } = body;

		if (!type || !zoneId || !cameraId) {
			return json({
				success: false,
				error: 'type, zoneId, and cameraId are required'
			}, { status: 400 });
		}

		if (type === 'trigger') {
			latencyTracker.recordTrigger(zoneId, cameraId, timestamp);
			return json({
				success: true,
				data: {
					type: 'trigger',
					zoneId,
					cameraId,
					timestamp
				}
			});
		} else if (type === 'follower_start') {
			const latency = latencyTracker.recordFollowerStart(zoneId, cameraId, timestamp);

			if (latency === null) {
				return json({
					success: false,
					error: 'No trigger found for this zone',
					data: {
						type: 'follower_start',
						zoneId,
						cameraId,
						timestamp,
						latency: null
					}
				}, { status: 400 });
			}

			// Check SLA
			const slaStatus = latencyTracker.checkSLA(latency);

			return json({
				success: true,
				data: {
					type: 'follower_start',
					zoneId,
					cameraId,
					timestamp,
					latency,
					sla: {
						breached: slaStatus.breached,
						threshold: slaStatus.threshold,
						message: slaStatus.message
					}
				}
			});
		} else {
			return json({
				success: false,
				error: 'Invalid type. Must be "trigger" or "follower_start"'
			}, { status: 400 });
		}
	} catch (error) {
		console.error('Failed to record latency measurement:', error);
		return json({
			success: false,
			error: 'Failed to record latency measurement'
		}, { status: 500 });
	}
};

/**
 * DELETE: Clear metrics for a zone
 * Query params:
 *   - zoneId: string (optional, if not provided clears all zones)
 */
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const zoneId = url.searchParams.get('zoneId') ?? undefined;

		latencyTracker.clearMetrics(zoneId);

		return json({
			success: true,
			data: {
				cleared: zoneId ? `zone: ${zoneId}` : 'all zones'
			}
		});
	} catch (error) {
		console.error('Failed to clear metrics:', error);
		return json({
			success: false,
			error: 'Failed to clear metrics'
		}, { status: 500 });
	}
};
