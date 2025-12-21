import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordingsRepo } from '$lib/db';
import { createReadStream, promises as fs } from 'fs';
import { Readable } from 'stream';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const recording = recordingsRepo.getRecordingById(params.id);

		if (!recording || !recording.thumbnailPath) {
			throw error(404, 'Thumbnail not found');
		}

		const stats = await fs.stat(recording.thumbnailPath);
		const stream = createReadStream(recording.thumbnailPath);
		const webStream = Readable.toWeb(stream) as ReadableStream;

		return new Response(webStream, {
			headers: {
				'Content-Length': stats.size.toString(),
				'Content-Type': 'image/jpeg',
				'Cache-Control': 'public, max-age=86400'
			}
		});
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			throw error(404, 'Thumbnail file not found');
		}
		throw err;
	}
};
