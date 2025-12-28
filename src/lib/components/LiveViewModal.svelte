<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { Modal } from './ui';
	import type { Device } from '$lib/types';
	import type mpegtsType from 'mpegts.js';

	interface Props {
		device: Device | null;
		open: boolean;
		onclose: () => void;
	}

	let { device, open = $bindable(), onclose }: Props = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let mpegtsReady = $state(false);
	let mpegtsPlayer: mpegtsType.Player | null = null;
	let mpegtsModule: typeof mpegtsType | null = null;
	let isIOSSafari = $state(false);
	let useNativeFallback = $state(false);

	onMount(async () => {
		// Detect iOS Safari
		const ua = navigator.userAgent;
		isIOSSafari = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);

		// Try to load mpegts.js
		try {
			mpegtsModule = (await import('mpegts.js')).default;

			// Check if MSE is supported
			if (mpegtsModule.isSupported()) {
				mpegtsReady = true;
			} else {
				// Fall back to native video for iOS
				useNativeFallback = true;
			}
		} catch (e) {
			console.warn('Failed to load mpegts.js, using native fallback');
			useNativeFallback = true;
		}
	});

	// Start player when modal opens and video element is ready
	$effect(() => {
		if (open && videoElement && device) {
			if (mpegtsReady && !useNativeFallback) {
				untrack(() => startMpegtsPlayer());
			} else if (useNativeFallback || isIOSSafari) {
				untrack(() => startNativePlayer());
			}
		}
	});

	// Clean up when modal closes
	$effect(() => {
		if (!open) {
			untrack(() => cleanup());
		}
	});

	function startMpegtsPlayer() {
		if (!videoElement || !device || !mpegtsModule) return;

		// Clean up existing player
		cleanup();

		error = null;
		loading = true;

		// Use absolute URL for Web Worker compatibility
		const streamUrl = new URL(`/api/devices/${device.id}/live`, window.location.origin).href;

		try {
			mpegtsPlayer = mpegtsModule.createPlayer(
				{
					type: 'mpegts',
					isLive: true,
					url: streamUrl
				},
				{
					enableWorker: true,
					liveBufferLatencyChasing: true,
					liveBufferLatencyMaxLatency: 1.5,
					liveBufferLatencyMinRemain: 0.3
				}
			);

			mpegtsPlayer.attachMediaElement(videoElement);

			mpegtsPlayer.on(mpegtsModule.Events.ERROR, (errorType: string, errorDetail: string) => {
				console.error('mpegts.js error:', errorType, errorDetail);
				error = `Stream error: ${errorDetail}`;
				loading = false;
			});

			mpegtsPlayer.on(mpegtsModule.Events.LOADING_COMPLETE, () => {
				console.log('Loading complete');
			});

			mpegtsPlayer.load();
			mpegtsPlayer.play();
		} catch (e) {
			console.error('Failed to start mpegts player:', e);
			error = 'Failed to start video stream';
			loading = false;
		}
	}

	function startNativePlayer() {
		if (!videoElement || !device) return;

		error = null;
		loading = true;

		// For iOS Safari, we need to use a different approach
		// The MPEG-TS stream won't work directly, so we show an error with explanation
		if (isIOSSafari) {
			error =
				'Live streaming is not fully supported on iOS Safari. Please use a desktop browser for live view.';
			loading = false;
			return;
		}

		// Try native video with the stream URL (may work on some browsers)
		const streamUrl = `/api/devices/${device.id}/live`;
		videoElement.src = streamUrl;
		videoElement.load();
		videoElement.play().catch((e) => {
			console.error('Native playback failed:', e);
			error = 'Failed to play video stream. Try using Chrome or Firefox.';
			loading = false;
		});
	}

	function cleanup() {
		if (mpegtsPlayer) {
			try {
				mpegtsPlayer.destroy();
			} catch (e) {
				// Ignore cleanup errors
			}
			mpegtsPlayer = null;
		}

		if (videoElement) {
			videoElement.pause();
			videoElement.src = '';
			videoElement.load();
		}

		error = null;
		loading = true;
	}

	function handleClose() {
		cleanup();
		onclose();
	}

	function handleVideoLoaded() {
		loading = false;
	}

	function handleVideoError() {
		if (!error) {
			loading = false;
			error = 'Failed to load live stream. Please try again.';
		}
	}
</script>

<Modal bind:open title="Live View - {device?.name ?? ''}" onclose={handleClose}>
	{#snippet children()}
		{#if device}
			<div class="space-y-4">
				<div class="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
					{#if error}
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="p-6 text-center">
								<svg
									class="mx-auto h-12 w-12 text-red-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
								<p
									data-testid="error-message"
									data-error-type="live-stream"
									class="mt-4 text-sm text-red-500"
								>
									{error}
								</p>
								{#if isIOSSafari}
									<p class="mt-2 text-xs text-zinc-400">
										iOS Safari doesn't support MPEG-TS streaming. For live view, please use Chrome
										or Firefox on a desktop computer.
									</p>
								{/if}
							</div>
						</div>
					{:else}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							bind:this={videoElement}
							class="h-full w-full"
							autoplay
							muted
							playsinline
							controls
							onloadeddata={handleVideoLoaded}
							onerror={handleVideoError}
						></video>

						{#if loading}
							<div
								class="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-zinc-700 px-3 py-1 text-sm font-medium text-white"
							>
								<svg
									class="h-4 w-4 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								LOADING...
							</div>
						{:else}
							<div
								class="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-sm font-medium text-white"
							>
								<span class="h-2 w-2 animate-pulse rounded-full bg-white"></span>
								LIVE
							</div>
						{/if}
					{/if}
				</div>
				<div class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
					<span>{device.name}</span>
					<span class="capitalize">{device.type}</span>
				</div>
			</div>
		{/if}
	{/snippet}
</Modal>
