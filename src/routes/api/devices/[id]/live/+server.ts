import type { RequestHandler } from './$types';
import { getCameras } from '$lib/ring';
import { createLogger } from '$lib/utils';

const logger = createLogger('live-view-api');

export const GET: RequestHandler = async ({ params, request }) => {
	const { id } = params;

	try {
		logger.info({ deviceId: id }, 'Live view requested');

		const cameras = await getCameras();
		const camera = cameras.find((c) => c.id.toString() === id);

		if (!camera) {
			logger.warn({ deviceId: id }, 'Camera not found');
			return new Response('Camera not found', { status: 404 });
		}

		logger.info({ deviceId: id, cameraName: camera.name }, 'Starting live stream');

		// Start the live stream
		const streamSession = await camera.streamVideo({
			output: [
				'-f', 'mp4',
				'-movflags', 'frag_keyframe+empty_moov+default_base_moof',
				'-reset_timestamps', '1',
				'-frag_duration', '1000000',
				'pipe:1'
			]
		});

		logger.info({ deviceId: id }, 'Stream session created');

		// Create a readable stream from the camera
		const stream = new ReadableStream({
			start(controller) {
				// Listen for data chunks
				const dataHandler = (chunk: Buffer) => {
					controller.enqueue(new Uint8Array(chunk));
				};

				const endHandler = () => {
					logger.info({ deviceId: id }, 'Stream ended');
					controller.close();
				};

				const errorHandler = (error: Error) => {
					logger.error({ deviceId: id, error }, 'Stream error');
					controller.error(error);
				};

				// Attach listeners (using any to bypass type checking)
				(streamSession as any).onCallEnded?.subscribe(() => {
					endHandler();
				});

				// Note: The actual streaming output is handled by ffmpeg piping to stdout
				// We'll handle this differently - by returning the stream directly
			},
			cancel() {
				logger.info({ deviceId: id }, 'Stream cancelled by client');
				streamSession.stop();
			}
		});

		// Return the stream with appropriate headers
		return new Response(stream, {
			headers: {
				'Content-Type': 'video/mp4',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Transfer-Encoding': 'chunked'
			}
		});
	} catch (error) {
		logger.error({ deviceId: id, error }, 'Failed to start live stream');
		return new Response(
			JSON.stringify({ error: 'Failed to start live stream' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
