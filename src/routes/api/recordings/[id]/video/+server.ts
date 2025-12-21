import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const recording = recordingsRepo.getRecordingById(params.id);

		if (!recording) {
			throw error(404, 'Recording not found');
		}

		if (recording.status !== 'completed') {
			throw error(404, 'Recording not ready');
		}

		// Get file stats
		const stats = await fs.stat(recording.filePath);
		const fileSize = stats.size;

		// Handle range requests for video seeking
		const range = request.headers.get('range');

		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = end - start + 1;

			const stream = createReadStream(recording.filePath, { start, end });
			const webStream = Readable.toWeb(stream) as ReadableStream;

			return new Response(webStream, {
				status: 206,
				headers: {
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': chunkSize.toString(),
					'Content-Type': 'video/mp4'
				}
			});
		}

		const stream = createReadStream(recording.filePath);
		const webStream = Readable.toWeb(stream) as ReadableStream;

		return new Response(webStream, {
			headers: {
				'Content-Length': fileSize.toString(),
				'Content-Type': 'video/mp4',
				'Accept-Ranges': 'bytes'
			}
		});
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, 'Video file not found');
		}
		throw err;
	}
};
