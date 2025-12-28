import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';
import { createLogger } from '$lib/utils/logger.server';

const logger = createLogger('api-events-stream');

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder();
	let closed = false;

	const stream = new ReadableStream({
		async start(controller) {
			// Send initial connection message
			try {
				controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));
			} catch (error) {
				closed = true;
				return;
			}

			// Keep track of the last event ID we've seen
			let lastEventCount = eventsRepo.getEventsCount();

			// Poll for new events every 2 seconds
			const interval = setInterval(async () => {
				if (closed) {
					clearInterval(interval);
					return;
				}

				try {
					const currentCount = eventsRepo.getEventsCount();

					if (currentCount > lastEventCount) {
						// Get the newest events
						const newEvents = eventsRepo.getEvents({
							limit: currentCount - lastEventCount
						});

						for (const event of newEvents) {
							if (closed) break;

							const data = JSON.stringify({
								type: 'event',
								payload: event
							});

							try {
								controller.enqueue(encoder.encode(`event: event\ndata: ${data}\n\n`));
							} catch (error) {
								closed = true;
								clearInterval(interval);
								return;
							}
						}

						lastEventCount = currentCount;
					}

					// Send heartbeat
					if (!closed) {
						try {
							controller.enqueue(encoder.encode(': heartbeat\n\n'));
						} catch (error) {
							closed = true;
							clearInterval(interval);
						}
					}
				} catch (error) {
					logger.error({ error }, 'SSE error');
				}
			}, 2000);

			// Clean up on close
			request.signal.addEventListener('abort', () => {
				if (closed) return;
				closed = true;
				clearInterval(interval);
				try {
					controller.close();
				} catch (error) {
					// Ignore errors if controller is already closed
				}
			});
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
