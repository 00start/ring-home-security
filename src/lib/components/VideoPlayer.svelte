<script lang="ts">
	import type { Recording } from '$lib/types';
	import { getVideoUrl, getThumbnailUrl } from '$lib/stores/recordings';

	interface Props {
		recording: Recording;
		autoplay?: boolean;
	}

	let { recording, autoplay = false }: Props = $props();

	let videoElement: HTMLVideoElement | undefined = $state();
	let isPlaying = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let isFullscreen = $state(false);

	function togglePlay() {
		if (!videoElement) return;

		if (isPlaying) {
			videoElement.pause();
		} else {
			videoElement.play();
		}
	}

	function handleTimeUpdate() {
		if (videoElement) {
			currentTime = videoElement.currentTime;
		}
	}

	function handleLoadedMetadata() {
		if (videoElement) {
			duration = videoElement.duration;
		}
	}

	function handleSeek(event: Event) {
		if (!videoElement) return;
		const input = event.target as HTMLInputElement;
		videoElement.currentTime = parseFloat(input.value);
	}

	function toggleFullscreen() {
		if (!videoElement) return;

		if (!document.fullscreenElement) {
			videoElement.requestFullscreen();
			isFullscreen = true;
		} else {
			document.exitFullscreen();
			isFullscreen = false;
		}
	}

	function formatTime(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div
	data-testid="video-player"
	data-recording-id={recording.id}
	class="relative overflow-hidden rounded-lg bg-black"
>
	<video
		bind:this={videoElement}
		src={getVideoUrl(recording.id)}
		poster={recording.thumbnailPath ? getThumbnailUrl(recording.id) : undefined}
		data-testid="video-element"
		class="w-full"
		{autoplay}
		preload="metadata"
		onplay={() => (isPlaying = true)}
		onpause={() => (isPlaying = false)}
		ontimeupdate={handleTimeUpdate}
		onloadedmetadata={handleLoadedMetadata}
	>
		<track kind="captions" />
	</video>

	<!-- Controls overlay -->
	<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
		<div class="flex items-center gap-4">
			<button
				data-testid="video-play-pause-button"
				data-playing={isPlaying}
				onclick={togglePlay}
				class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
			>
				{#if isPlaying}
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
					</svg>
				{:else}
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>

			<div class="flex flex-1 items-center gap-2 text-sm text-white">
				<span>{formatTime(currentTime)}</span>
				<input
					type="range"
					min="0"
					max={duration}
					value={currentTime}
					oninput={handleSeek}
					class="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30"
				/>
				<span>{formatTime(duration)}</span>
			</div>

			<button
				data-testid="video-fullscreen-button"
				onclick={toggleFullscreen}
				class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
				aria-label="Toggle fullscreen"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>
