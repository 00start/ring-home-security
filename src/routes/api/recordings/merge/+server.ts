/**
 * FTR-001: Multi-Clip Merge API Endpoint
 * POST: Queue merge job for multiple recordings
 * GET: Check merge job status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Recording } from '$lib/types';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-recordings-merge');

// In-memory job storage (in production, this would be Redis or similar)
const mergeJobs = new Map<string, MergeJob>();

interface MergeJob {
	jobId: string;
	status: 'queued' | 'processing' | 'completed' | 'failed';
	recordingIds: string[];
	recordings: Recording[];
	progress: number;
	currentStep?: string;
	error?: string;
	downloadUrl?: string;
	createdAt: Date;
	completedAt?: Date;
}

interface MergeRequest {
	recordingIds: string[];
}

interface ValidationResult {
	valid: boolean;
	validRecordings: Recording[];
	invalidRecordings: string[];
	errors: string[];
}

/**
 * Validate recordings for merge
 */
function validateRecordings(recordingIds: string[]): ValidationResult {
	const errors: string[] = [];
	const validRecordings: Recording[] = [];
	const invalidRecordings: string[] = [];

	// Check for empty selection
	if (!recordingIds || recordingIds.length === 0) {
		errors.push('No recordings provided');
		return {
			valid: false,
			validRecordings: [],
			invalidRecordings: [],
			errors
		};
	}

	// Check max limit (10 clips)
	if (recordingIds.length > 10) {
		errors.push('Cannot merge more than 10 recordings at once');
	}

	// Validate each recording
	for (const recordingId of recordingIds) {
		const recording = recordingsRepo.getRecordingById(recordingId);

		if (!recording) {
			invalidRecordings.push(recordingId);
			errors.push(`Recording ${recordingId} not found`);
			continue;
		}

		// Check if recording is completed
		if (recording.status !== 'completed') {
			invalidRecordings.push(recordingId);
			errors.push(`Recording ${recordingId} is not completed (status: ${recording.status})`);
			continue;
		}

		validRecordings.push(recording);
	}

	return {
		valid: errors.length === 0 && validRecordings.length > 0,
		validRecordings,
		invalidRecordings,
		errors
	};
}

/**
 * Sort recordings by creation date (chronological order)
 */
function sortRecordingsChronologically(recordings: Recording[]): Recording[] {
	return [...recordings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/**
 * POST: Queue a new merge job
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as MergeRequest;
		const { recordingIds } = body;

		// Validate recordings
		const validation = validateRecordings(recordingIds);

		if (!validation.valid) {
			return json(
				{
					success: false,
					error: validation.errors.join('; '),
					details: validation
				},
				{ status: 400 }
			);
		}

		// Sort recordings chronologically
		const sortedRecordings = sortRecordingsChronologically(validation.validRecordings);
		const sortedIds = sortedRecordings.map((r) => r.id);

		// Create merge job
		const jobId = uuidv4();
		const job: MergeJob = {
			jobId,
			status: 'queued',
			recordingIds: sortedIds,
			recordings: sortedRecordings,
			progress: 0,
			currentStep: 'Queued',
			createdAt: new Date()
		};

		// Store job
		mergeJobs.set(jobId, job);

		// In production, this would queue the job to a worker
		// For now, we'll simulate async processing
		simulateMergeProcessing(jobId);

		return json({
			success: true,
			data: {
				jobId: job.jobId,
				status: job.status,
				recordingIds: job.recordingIds,
				estimatedDuration: sortedRecordings.reduce((sum, r) => sum + r.duration, 0)
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to queue merge job');
		return json(
			{
				success: false,
				error: 'Failed to queue merge job'
			},
			{ status: 500 }
		);
	}
};

/**
 * GET: Get merge job status
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const jobId = url.searchParams.get('jobId');

		if (!jobId) {
			return json(
				{
					success: false,
					error: 'Job ID is required'
				},
				{ status: 400 }
			);
		}

		const job = mergeJobs.get(jobId);

		if (!job) {
			return json(
				{
					success: false,
					error: 'Job not found'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: {
				jobId: job.jobId,
				status: job.status,
				progress: job.progress,
				currentStep: job.currentStep,
				error: job.error,
				downloadUrl: job.downloadUrl,
				recordingCount: job.recordingIds.length,
				createdAt: job.createdAt,
				completedAt: job.completedAt
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get merge job status');
		return json(
			{
				success: false,
				error: 'Failed to get merge job status'
			},
			{ status: 500 }
		);
	}
};

/**
 * Simulate merge processing (in production, this would be a worker)
 */
function simulateMergeProcessing(jobId: string): void {
	const job = mergeJobs.get(jobId);
	if (!job) return;

	// Simulate processing steps
	setTimeout(() => {
		job.status = 'processing';
		job.progress = 20;
		job.currentStep = 'Preparing merge';
	}, 500);

	setTimeout(() => {
		job.progress = 40;
		job.currentStep = `Merging clip 1 of ${job.recordingIds.length}`;
	}, 1500);

	setTimeout(() => {
		job.progress = 60;
		job.currentStep = `Merging clip 2 of ${job.recordingIds.length}`;
	}, 3000);

	setTimeout(() => {
		job.progress = 80;
		job.currentStep = 'Finalizing merge';
	}, 4500);

	setTimeout(() => {
		// Complete the job
		job.status = 'completed';
		job.progress = 100;
		job.currentStep = 'Complete';
		job.downloadUrl = `/api/recordings/merged/${jobId}/download`;
		job.completedAt = new Date();
	}, 6000);
}

/**
 * Delete old jobs (cleanup)
 */
export function cleanupOldJobs(): void {
	const maxAge = 24 * 60 * 60 * 1000; // 24 hours
	const now = Date.now();

	for (const [jobId, job] of mergeJobs.entries()) {
		const age = now - job.createdAt.getTime();
		if (age > maxAge) {
			mergeJobs.delete(jobId);
		}
	}
}

// Run cleanup every hour
setInterval(cleanupOldJobs, 60 * 60 * 1000);
