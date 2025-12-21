import type { RequestHandler } from './$types';
import { getCameras } from '$lib/ring';
import { createLogger } from '$lib/utils/logger.server';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';

const logger = createLogger('live-view-api');

export const GET: RequestHandler = async ({ params }) => {
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

		// Create PassThrough stream for video data
		const videoOutput = new PassThrough();

		// Spawn FFmpeg to convert RTP to MP4
		const ffmpeg = spawn('ffmpeg', [
			'-i', 'pipe:0', // Read from stdin
			'-f', 'mp4',
			'-movflags', 'frag_keyframe+empty_moov+default_base_moof',
			'-frag_duration', '1000000',
			'-reset_timestamps', '1',
			'pipe:1' // Write to stdout
		]);

		logger.info({ deviceId: id }, 'FFmpeg process spawned');

		// Start the live stream and pipe RTP data to FFmpeg
		const sipCall = await camera.streamVideo({
			output: ffmpeg.stdin
		});

		logger.info({ deviceId: id }, 'Stream session created, piping to FFmpeg');

		// Pipe FFmpeg output to our PassThrough stream
		ffmpeg.stdout.pipe(videoOutput);

		// Handle FFmpeg errors
		ffmpeg.stderr.on('data', (data) => {
			logger.debug({ deviceId: id, stderr: data.toString() }, 'FFmpeg stderr');
		});

		ffmpeg.on('error', (error) => {
			logger.error({ deviceId: id, error }, 'FFmpeg process error');
		});

		// Convert PassThrough stream to web ReadableStream
		const stream = new ReadableStream({
			start(controller) {
				let isClosed = false;

				const closeController = (reason: string) => {
					if (isClosed) return;
					isClosed = true;

					try {
						controller.close();
						logger.info({ deviceId: id, reason }, 'Stream controller closed');
					} catch (error) {
						// Controller already closed, ignore
					}
				};

				videoOutput.on('data', (chunk: Buffer) => {
					if (!isClosed) {
						try {
							controller.enqueue(new Uint8Array(chunk));
						} catch (error) {
							logger.error({ deviceId: id, error }, 'Error enqueuing data');
							closeController('enqueue-error');
						}
					}
				});

				videoOutput.on('end', () => {
					logger.info({ deviceId: id }, 'Video output ended');
					closeController('stream-end');
				});

				videoOutput.on('error', (error: Error) => {
					logger.error({ deviceId: id, error }, 'Video output error');
					if (!isClosed) {
						isClosed = true;
						try {
							controller.error(error);
						} catch (e) {
							// Controller already closed, ignore
						}
					}
				});

				ffmpeg.on('exit', (code: number) => {
					logger.info({ deviceId: id, exitCode: code }, 'FFmpeg exited');
					closeController('ffmpeg-exit');
				});

				// Clean up when SIP call ends
				sipCall.onCallEnded.subscribe(() => {
					logger.info({ deviceId: id }, 'SIP call ended');
					ffmpeg.kill();
					closeController('sip-call-ended');
				});
			},
			cancel() {
				logger.info({ deviceId: id }, 'Stream cancelled by client');
				sipCall.stop();
				ffmpeg.kill();
			}
		});

		// Return the stream with appropriate headers
		return new Response(stream, {
			headers: {
				'Content-Type': 'video/mp4',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		logger.error({
			deviceId: id,
			error,
			errorMessage,
			errorStack,
			errorType: error?.constructor?.name
		}, 'Failed to start live stream');
		return new Response(
			JSON.stringify({ error: 'Failed to start live stream', message: errorMessage }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
