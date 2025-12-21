// BullMQ job queue definitions
// TODO: Implement job queue using BullMQ with Redis

import type { TranscodeJob } from '$lib/types/index.js';

export interface QueueClient {
	// Transcode queue operations
	addTranscodeJob(job: Omit<TranscodeJob, 'id' | 'status' | 'createdAt'>): Promise<string>;
	getTranscodeJob(id: string): Promise<TranscodeJob | null>;
	getQueueStats(): Promise<{
		waiting: number;
		active: number;
		completed: number;
		failed: number;
	}>;

	// Connection management
	connect(): Promise<void>;
	disconnect(): Promise<void>;
}

export interface TranscodeWorkerConfig {
	redisUrl: string;
	concurrency: number;
	ffmpegPath?: string;
}

// Placeholder - will be implemented with BullMQ
export function createQueueClient(_redisUrl: string): QueueClient {
	throw new Error('Queue client not yet implemented');
}
