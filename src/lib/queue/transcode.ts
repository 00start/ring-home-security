import { Queue, Worker, Job } from 'bullmq';
import { getRedisConnection } from './connection';
import type { TranscodeJobData, TranscodeJobResult } from '$lib/types';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('transcode-queue');

const QUEUE_NAME = 'transcode';

let transcodeQueue: Queue<TranscodeJobData, TranscodeJobResult> | null = null;

export function getTranscodeQueue(): Queue<TranscodeJobData, TranscodeJobResult> {
	if (!transcodeQueue) {
		const connection = getRedisConnection();

		transcodeQueue = new Queue(QUEUE_NAME, {
			connection,
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 5000
				},
				removeOnComplete: {
					age: 3600 * 24, // Keep completed jobs for 24 hours
					count: 1000
				},
				removeOnFail: {
					age: 3600 * 24 * 7 // Keep failed jobs for 7 days
				}
			}
		});

		logger.info('Transcode queue initialized');
	}

	return transcodeQueue;
}

export async function addTranscodeJob(data: TranscodeJobData): Promise<Job<TranscodeJobData, TranscodeJobResult>> {
	const queue = getTranscodeQueue();

	const job = await queue.add('transcode', data, {
		priority: 1,
		jobId: data.recordingId
	});

	logger.info({ jobId: job.id, recordingId: data.recordingId }, 'Transcode job added');

	return job;
}

export function createTranscodeWorker(
	processor: (job: Job<TranscodeJobData>) => Promise<TranscodeJobResult>
): Worker<TranscodeJobData, TranscodeJobResult> {
	const connection = getRedisConnection();

	const worker = new Worker<TranscodeJobData, TranscodeJobResult>(QUEUE_NAME, processor, {
		connection,
		concurrency: 2,
		limiter: {
			max: 4,
			duration: 60000 // Max 4 jobs per minute to prevent overload
		}
	});

	worker.on('completed', (job, result) => {
		logger.info({ jobId: job.id, result }, 'Transcode job completed');
	});

	worker.on('failed', (job, error) => {
		logger.error({ jobId: job?.id, error: error.message }, 'Transcode job failed');
	});

	worker.on('error', (error) => {
		logger.error({ error: error.message }, 'Worker error');
	});

	logger.info('Transcode worker created');

	return worker;
}

export async function closeTranscodeQueue(): Promise<void> {
	if (transcodeQueue) {
		await transcodeQueue.close();
		transcodeQueue = null;
		logger.info('Transcode queue closed');
	}
}
