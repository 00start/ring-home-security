import type { RequestHandler } from './$types';
import { eventsRepo } from '$lib/db';

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder();
	let closed = false;

	const stream = new ReadableStream({
		async start(controller) {
			// Send initial connection message
			controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

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
							const data = JSON.stringify({
								type: 'event',
								payload: event
							});
							controller.enqueue(encoder.encode(`event: event\ndata: ${data}\n\n`));
						}

						lastEventCount = currentCount;
					}

					// Send heartbeat
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch (error) {
					console.error('SSE error:', error);
				}
			}, 2000);

			// Clean up on close
			request.signal.addEventListener('abort', () => {
				closed = true;
				clearInterval(interval);
				controller.close();
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
