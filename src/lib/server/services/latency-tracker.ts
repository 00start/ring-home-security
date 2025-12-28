/**
 * FTR-002: Zone Trigger Latency Tracker Service
 * Measures and monitors latency when zones trigger follower camera recordings
 */

interface LatencyMeasurement {
	zoneId: string;
	cameraId: string;
	triggerTimestamp: number;
	followerStartTimestamp?: number;
	latency?: number;
	recordedAt: Date;
}

interface TimeRange {
	start: Date;
	end: Date;
}

interface LatencyPercentiles {
	p50: number;
	p95: number;
	p99: number;
	count: number;
}

interface SLAStatus {
	breached: boolean;
	threshold: number;
	actualLatency: number;
	message?: string;
}

interface LatencyStats {
	zoneId: string;
	measurements: number;
	min: number;
	max: number;
	avg: number;
	percentiles: LatencyPercentiles;
	slaBreach: number;
	timeRange: TimeRange;
}

const SLA_THRESHOLD_MS = 500;

class LatencyTracker {
	private measurements: Map<string, LatencyMeasurement>;
	private completedMeasurements: LatencyMeasurement[];
	private slaBreachCount: Map<string, number>;

	constructor() {
		this.measurements = new Map();
		this.completedMeasurements = [];
		this.slaBreachCount = new Map();
	}

	/**
	 * Record when a trigger camera detects motion
	 */
	recordTrigger(zoneId: string, cameraId: string, timestamp: number): void {
		const key = `${zoneId}-${cameraId}-${timestamp}`;
		this.measurements.set(key, {
			zoneId,
			cameraId,
			triggerTimestamp: timestamp,
			recordedAt: new Date()
		});
	}

	/**
	 * Record when a follower camera starts recording
	 * Returns calculated latency in milliseconds
	 */
	recordFollowerStart(zoneId: string, cameraId: string, timestamp: number): number | null {
		// Find the most recent trigger for this zone
		let latestTrigger: LatencyMeasurement | null = null;
		let latestKey: string | null = null;

		for (const [key, measurement] of this.measurements) {
			if (
				measurement.zoneId === zoneId &&
				!measurement.followerStartTimestamp &&
				(!latestTrigger || measurement.triggerTimestamp > latestTrigger.triggerTimestamp)
			) {
				latestTrigger = measurement;
				latestKey = key;
			}
		}

		if (!latestTrigger || !latestKey) {
			return null;
		}

		// Calculate latency
		const latency = timestamp - latestTrigger.triggerTimestamp;

		// Update measurement
		latestTrigger.followerStartTimestamp = timestamp;
		latestTrigger.latency = latency;

		// Move to completed measurements
		this.completedMeasurements.push(latestTrigger);
		this.measurements.delete(latestKey);

		// Check SLA
		const slaStatus = this.checkSLA(latency);
		if (slaStatus.breached) {
			const currentCount = this.slaBreachCount.get(zoneId) || 0;
			this.slaBreachCount.set(zoneId, currentCount + 1);
		}

		return latency;
	}

	/**
	 * Calculate latency for a specific zone and camera
	 */
	calculateLatency(zoneId: string, cameraId: string): number | null {
		// Look in completed measurements first
		const completed = this.completedMeasurements
			.filter((m) => m.zoneId === zoneId && m.cameraId === cameraId)
			.sort((a, b) => b.triggerTimestamp - a.triggerTimestamp);

		if (completed.length > 0 && completed[0].latency !== undefined) {
			return completed[0].latency;
		}

		return null;
	}

	/**
	 * Calculate percentiles from array of latencies
	 */
	private calculatePercentilesFromArray(latencies: number[]): LatencyPercentiles {
		if (latencies.length === 0) {
			return { p50: 0, p95: 0, p99: 0, count: 0 };
		}

		const sorted = [...latencies].sort((a, b) => a - b);
		const count = sorted.length;

		const p50Index = Math.floor(count * 0.5);
		const p95Index = Math.floor(count * 0.95);
		const p99Index = Math.floor(count * 0.99);

		return {
			p50: sorted[Math.min(p50Index, count - 1)],
			p95: sorted[Math.min(p95Index, count - 1)],
			p99: sorted[Math.min(p99Index, count - 1)],
			count
		};
	}

	/**
	 * Get percentiles for a zone within a time range
	 */
	getPercentiles(zoneId: string, timeRange: TimeRange): LatencyPercentiles {
		const latencies = this.completedMeasurements
			.filter((m) => {
				if (m.zoneId !== zoneId || m.latency === undefined) return false;
				const recordedAt = m.recordedAt.getTime();
				return recordedAt >= timeRange.start.getTime() && recordedAt <= timeRange.end.getTime();
			})
			.map((m) => m.latency!);

		return this.calculatePercentilesFromArray(latencies);
	}

	/**
	 * Check if latency breaches SLA
	 */
	checkSLA(latency: number): SLAStatus {
		const breached = latency > SLA_THRESHOLD_MS;
		return {
			breached,
			threshold: SLA_THRESHOLD_MS,
			actualLatency: latency,
			message: breached
				? `Latency ${latency}ms exceeds SLA threshold of ${SLA_THRESHOLD_MS}ms`
				: undefined
		};
	}

	/**
	 * Get comprehensive latency statistics for a zone
	 */
	getLatencyStats(zoneId: string, timeRange: TimeRange): LatencyStats {
		const measurements = this.completedMeasurements.filter((m) => {
			if (m.zoneId !== zoneId || m.latency === undefined) return false;
			const recordedAt = m.recordedAt.getTime();
			return recordedAt >= timeRange.start.getTime() && recordedAt <= timeRange.end.getTime();
		});

		const latencies = measurements.map((m) => m.latency!);

		if (latencies.length === 0) {
			return {
				zoneId,
				measurements: 0,
				min: 0,
				max: 0,
				avg: 0,
				percentiles: { p50: 0, p95: 0, p99: 0, count: 0 },
				slaBreach: this.slaBreachCount.get(zoneId) || 0,
				timeRange
			};
		}

		const min = Math.min(...latencies);
		const max = Math.max(...latencies);
		const avg = Math.round(latencies.reduce((sum, l) => sum + l, 0) / latencies.length);
		const percentiles = this.calculatePercentilesFromArray(latencies);

		return {
			zoneId,
			measurements: latencies.length,
			min,
			max,
			avg,
			percentiles,
			slaBreach: this.slaBreachCount.get(zoneId) || 0,
			timeRange
		};
	}

	/**
	 * Clear metrics for a specific zone or all zones
	 */
	clearMetrics(zoneId?: string): void {
		if (zoneId) {
			// Clear measurements for specific zone
			for (const [key, measurement] of this.measurements) {
				if (measurement.zoneId === zoneId) {
					this.measurements.delete(key);
				}
			}
			this.completedMeasurements = this.completedMeasurements.filter((m) => m.zoneId !== zoneId);
			this.slaBreachCount.delete(zoneId);
		} else {
			// Clear all metrics
			this.measurements.clear();
			this.completedMeasurements = [];
			this.slaBreachCount.clear();
		}
	}

	/**
	 * Get all zones that have metrics
	 */
	getTrackedZones(): string[] {
		const zones = new Set<string>();
		for (const measurement of this.completedMeasurements) {
			zones.add(measurement.zoneId);
		}
		return Array.from(zones);
	}

	/**
	 * Clean up old measurements (older than specified days)
	 */
	cleanupOldMeasurements(days: number = 7): number {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - days);
		const cutoffTime = cutoffDate.getTime();

		const beforeCount = this.completedMeasurements.length;
		this.completedMeasurements = this.completedMeasurements.filter(
			(m) => m.recordedAt.getTime() >= cutoffTime
		);
		const afterCount = this.completedMeasurements.length;

		return beforeCount - afterCount;
	}
}

// Singleton instance
export const latencyTracker = new LatencyTracker();

// Export types
export type { LatencyMeasurement, TimeRange, LatencyPercentiles, SLAStatus, LatencyStats };
