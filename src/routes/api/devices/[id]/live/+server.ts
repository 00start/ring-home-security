import type { RequestHandler } from './$types';
import { getCameras } from '$lib/ring';
import { createLogger } from '$lib/utils/logger.server';
import { config } from '$lib/config';

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

		// Check battery level and warn if low (but allow stream to proceed)
		if (camera.batteryLevel !== null && camera.batteryLevel !== undefined) {
			if (camera.batteryLevel < config.batteryLowThreshold) {
				logger.warn(
					{ deviceId: id, batteryLevel: camera.batteryLevel, threshold: config.batteryLowThreshold },
					'Live view started on low battery camera'
				);
			}
		}

		logger.info({ deviceId: id, cameraName: camera.name }, 'Starting live stream');

		// Create a ReadableStream that will receive video data from the stdoutCallback
		let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
		let sipCall: Awaited<ReturnType<typeof camera.streamVideo>> | null = null;
		let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
		let lastDataTime = Date.now();

		const stream = new ReadableStream({
			async start(controller) {
				streamController = controller;

				try {
					// Start the live stream with stdoutCallback to receive MPEGTS data
					// Transcode to H.264 baseline profile for maximum browser compatibility
					sipCall = await camera.streamVideo({
						output: [
							'-f', 'mpegts',
							'-codec:v', 'libx264',
							'-preset', 'ultrafast',
							'-tune', 'zerolatency',
							'-profile:v', 'baseline',
							'-level', '3.0',
							'-pix_fmt', 'yuv420p',
							'-g', '30',
							'-codec:a', 'aac',
							'-ar', '44100',
							'-ac', '2',
							'pipe:1'
						],
						stdoutCallback: (data: Buffer) => {
							try {
								if (streamController && data.length > 0) {
									lastDataTime = Date.now();
									controller.enqueue(new Uint8Array(data));
								}
							} catch (error) {
								logger.error({ deviceId: id, error }, 'Error enqueuing video data');
							}
						}
					});

					logger.info({ deviceId: id }, 'Stream session created');

					// Set up auto-timeout to stop stream after inactivity (battery-friendly)
					const timeoutSeconds = config.liveViewTimeoutSeconds;
					if (timeoutSeconds > 0) {
						const checkTimeout = () => {
							const now = Date.now();
							const idleTime = (now - lastDataTime) / 1000;

							if (idleTime > timeoutSeconds) {
								logger.info(
									{ deviceId: id, idleTimeSeconds: idleTime, timeoutSeconds },
									'Live view auto-stopped due to inactivity timeout'
								);
								if (sipCall) {
									sipCall.stop();
								}
								return;
							}

							// Also stop after max duration regardless of activity
							timeoutHandle = setTimeout(checkTimeout, 30000); // Check every 30 seconds
						};

						// Start the timeout checker
						timeoutHandle = setTimeout(checkTimeout, 30000);

						// Also set a hard maximum duration for live view
						const maxDurationMs = timeoutSeconds * 1000;
						setTimeout(() => {
							if (sipCall) {
								logger.info(
									{ deviceId: id, maxDurationSeconds: timeoutSeconds },
									'Live view auto-stopped after maximum duration'
								);
								sipCall.stop();
							}
						}, maxDurationMs);
					}

					// Clean up when SIP call ends
					sipCall.onCallEnded.subscribe(() => {
						logger.info({ deviceId: id }, 'SIP call ended');
						if (timeoutHandle) {
							clearTimeout(timeoutHandle);
							timeoutHandle = null;
						}
						try {
							controller.close();
						} catch (e) {
							// Controller already closed, ignore
						}
						streamController = null;
					});
				} catch (error) {
					logger.error({ deviceId: id, error }, 'Error starting stream');
					if (timeoutHandle) {
						clearTimeout(timeoutHandle);
						timeoutHandle = null;
					}
					try {
						controller.error(error);
					} catch (e) {
						// Controller already closed, ignore
					}
					streamController = null;
				}
			},
			cancel() {
				logger.info({ deviceId: id }, 'Stream cancelled by client');
				if (timeoutHandle) {
					clearTimeout(timeoutHandle);
					timeoutHandle = null;
				}
				if (sipCall) {
					sipCall.stop();
				}
				streamController = null;
			}
		});

		// Return the stream with appropriate headers
		return new Response(stream, {
			headers: {
				'Content-Type': 'video/mp2t',
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
