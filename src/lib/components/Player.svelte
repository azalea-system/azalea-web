<script lang="ts">
	import {
		Volume2,
		VolumeX,
		Play,
		Pause,
		SkipBack,
		SkipForward,
		FastForward,
		ChevronLeft,
		Menu,
		Copy,
		ListPlus,
		ListMusic,
		Heart,
		Star
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		isPlaying,
		getCurrentTime,
		setCurrentTime,
		getDuration,
		setDuration,
		getVolume,
		setVolume,
		getMuted,
		toggleMute as storeToggleMute,
		getCurrentTrack,
		setAudioElement,
		togglePlay,
		nextTrack,
		prevTrack,
		seek,
		onTrackEnded,
		queueSongsNow,
		queueSongsNext,
		addToQueue,
		getRepeatMode,
		cycleRepeatMode,
		getShuffleMode,
		toggleShuffleMode,
		getToastMessage,
		clearToastMessage
	} from '$lib/stores/player.svelte';
	import { goto } from '$app/navigation';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { getCoverArtUrl, getBase, getAlbum, toggleStar } from '$lib/api';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import LyricsSidebar from '$lib/components/LyricsDrawer.svelte';
	import MobileFullPlayer from '$lib/components/MobileFullPlayer.svelte';
	import {
		getAccentColor,
		getServerAuth,
		isMediaSessionEnabled
	} from '$lib/stores/settings.svelte';


	let audioEl: HTMLAudioElement;
	let repeatMode = $derived(getRepeatMode());
	let shuffleMode = $derived(getShuffleMode());
	let favStyle = $derived(getFavouriteSongStyle());
	let rafId: number | null = null;

	function onLoadedMetadata() {
		setDuration(audioEl.duration);
	}

	function onEnded() {
		onTrackEnded();
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		const seekTime = parseFloat(target.value);
		seek(seekTime);
	}

	function sliderToVolume(slider: number): number {
		return slider * slider * slider;
	}

	function volumeToSlider(v: number): number {
		if (v <= 0) return 0;
		return Math.pow(v, 1 / 3);
	}

	function handleVolume(e: Event) {
		const target = e.target as HTMLInputElement;
		const sliderValue = parseFloat(target.value);
		setVolume(sliderToVolume(sliderValue));
	}

	let currentTrack = $derived(getCurrentTrack());
	let playing = $derived(isPlaying());
	let currentTime = $derived(getCurrentTime());
	let duration = $derived(getDuration());
	let volume = $derived(getVolume());
	let mutedState = $derived(getMuted());

	function toggleMute() {
		storeToggleMute();
	}

	$effect(() => {
		if (playing) {
			function tick() {
				if (audioEl) setCurrentTime(audioEl.currentTime);
				rafId = requestAnimationFrame(tick);
			}
			rafId = requestAnimationFrame(tick);
		} else {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		}
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	});

	function fmt(s: number): string {
		if (isNaN(s) || !isFinite(s) || s === 0) return '0:00';
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			const target = e.target as HTMLElement;

			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return;
			}

			e.preventDefault();
			togglePlay();
		}
	}

	let coverError = $state(false);
	let showLyrics = $state(false);
	let showFullPlayer = $state(false);
	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: typeof Play; action: () => void }[];
	} | null>(null);

	let serverStatusMessage = $state<string | null>(null);
	let toastMessage = $derived(getToastMessage());

	$effect(() => {
		if (toastMessage) {
			const timer = setTimeout(() => clearToastMessage(), 4000);
			return () => clearTimeout(timer);
		}
	});

	async function probeServer() {
		const auth = getServerAuth();
		const url = `${getBase()}/rest/ping?f=json`;
		const headers: Record<string, string> = {};
		if (auth?.username) {
			const token = btoa(`${auth.username}:${auth.password}`);
			headers['Authorization'] = `Basic ${token}`;
		}
		try {
			const controller = new AbortController();
			const id = setTimeout(() => controller.abort(), 3000);
			const res = await fetch(url, { headers, signal: controller.signal });
			clearTimeout(id);
			if (res.status === 401) {
				serverStatusMessage = 'Unable to authenticate to server';
				return;
			}
			if (!res.ok) {
				serverStatusMessage = "Can't connect to server";
				return;
			}
			serverStatusMessage = null;
		} catch (e) {
			serverStatusMessage = "Can't connect to server";
		}
	}

	$effect(() => {
		setAudioElement(audioEl);
		coverError = false;
	});

	$effect(() => {
		probeServer();
		const iv = setInterval(probeServer, 5000);
		return () => clearInterval(iv);
	});

	$effect(() => {
		if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
		if (!isMediaSessionEnabled()) return;

		const ms = (navigator as any).mediaSession;

		if (currentTrack) {
			const coverId =
				currentTrack.coverArt || (currentTrack.album_id ? `al-${currentTrack.album_id}` : '');
			ms.metadata = new (window as any).MediaMetadata({
				title: currentTrack.title,
				artist: currentTrack.artist,
				album: currentTrack.album,
				artwork: coverId
					? [{ src: getCoverArtUrl(coverId, 512), sizes: '512x512', type: 'image/jpeg' }]
					: []
			});
		} else {
			ms.metadata = null;
		}

		ms.setActionHandler('play', () => {
			if (!isPlaying()) togglePlay();
		});
		ms.setActionHandler('pause', () => {
			if (isPlaying()) togglePlay();
		});
		ms.setActionHandler('previoustrack', () => prevTrack());
		ms.setActionHandler('nexttrack', () => nextTrack());
		ms.setActionHandler('seekto', (details: any) => {
			if (details.fastSeek && (audioEl as any).fastSeek)
				(audioEl as any).fastSeek(details.seekTime);
			else if (audioEl) {
				audioEl.currentTime = details.seekTime;
				setCurrentTime(details.seekTime);
			}
		});

		const updatePosition = () => {
			if (!('setPositionState' in ms) || !audioEl || !currentTrack) return;
			try {
				ms.setPositionState({
					playbackRate: 1.0,
					position: audioEl.currentTime,
					duration: isFinite(duration) && duration > 0 ? duration : NaN
				});
			} catch {}
		};
		const posInterval = setInterval(updatePosition, 1000);
		updatePosition();

		return () => clearInterval(posInterval);
	});

	$effect(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	function handleArtistContext(e: MouseEvent) {
		e.preventDefault();
		if (!currentTrack) return;
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{
					label: 'Copy name',
					icon: Copy,
					action: () => navigator.clipboard.writeText(currentTrack!.artist)
				}
			]
		};
	}

	async function handleAlbumContext(e: MouseEvent) {
		e.preventDefault();
		if (!currentTrack?.album_id) return;
		try {
			const album = await getAlbum(currentTrack.album_id);
			const songs = album.song;
			if (!songs?.length) return;
			ctxMenu = {
				x: e.clientX,
				y: e.clientY,
				items: [
					{ label: 'Play now', icon: Play, action: () => queueSongsNow(songs) },
					{ label: 'Play next', icon: ListPlus, action: () => queueSongsNext(songs) },
					{
						label: 'Add to queue',
						icon: ListMusic,
						action: () => songs.forEach((s) => addToQueue(s))
					}
				]
			};
		} catch {}
	}
</script>

<audio
	bind:this={audioEl}
	preload="auto"
	crossorigin="anonymous"
	onloadedmetadata={onLoadedMetadata}
	onended={onEnded}
></audio>

<div
	class="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-700 bg-zinc-900/80 backdrop-blur lg:hidden"
	style="padding-bottom: env(safe-area-inset-bottom, 0px)"
	role="button"
	tabindex="0"
	onclick={() => {
		if (currentTrack) showFullPlayer = true;
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' && currentTrack) showFullPlayer = true;
	}}
>
	<div class="flex items-center gap-3 px-3 pb-14 pt-2">
		{#if currentTrack && !coverError}
			<img
				src={getCoverArtUrl(currentTrack.coverArt, 64)}
				alt=""
				class="h-10 w-10 shrink-0 overflow-hidden rounded bg-zinc-800 object-cover"
				onerror={() => (coverError = true)}
			/>
		{/if}
		{#if !currentTrack || coverError}
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500"
			>
				<Menu class="h-5 w-5" />
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium text-zinc-100">
				{currentTrack?.title ?? 'No track playing'}
			</p>
			<p class="truncate text-xs text-zinc-400">
				{currentTrack?.artist ?? ''}
			</p>
		</div>
		<Button
			onclick={(e) => {
				e.stopPropagation();
				togglePlay();
			}}
			disabled={!currentTrack}
			class="text-zinc-100"
			aria-label={playing ? 'Pause' : 'Play'}
			variant="ghost"
			size="icon"
		>
			{#if playing}
				<Pause class="h-6 w-6" />
			{:else}
				<Play class="h-6 w-6" />
			{/if}
		</Button>
	</div>
</div>

<div
	class="fixed bottom-0 left-0 right-0 z-50 hidden h-20 items-center gap-4 border-t border-zinc-700 bg-zinc-900/80 pr-4 backdrop-blur lg:flex"
>
	<div class="flex min-w-0 items-center gap-3 flex-1 h-full">
		<div
			class="relative h-full shrink-0 overflow-hidden bg-zinc-800"
			role="button"
			tabindex="0"
			onclick={() => {
				if (currentTrack) {
					goto('/albums/' + currentTrack.album_id);
				}
			}}
			onkeydown={(e) => {
				if (e.key === 'Enter' && currentTrack) goto('/albums/' + currentTrack.album_id);
			}}
			oncontextmenu={(e) => handleAlbumContext(e)}
		>
			{#if currentTrack && !coverError}
				<img
					src={getCoverArtUrl(currentTrack.coverArt, 128)}
					alt=""
					class="h-full aspect-square cursor-pointer rounded-none!"
					onerror={() => (coverError = true)}
				/>
			{/if}
			{#if !currentTrack || coverError}
				<div class="flex h-full w-full items-center justify-center text-zinc-500">
					<Menu class="h-5 w-5" />
				</div>
			{/if}
		</div>
		<div class="min-w-0">
			<p class="truncate text-sm font-medium text-zinc-100">
				{currentTrack?.title ?? 'No track playing'}
			</p>
			<p class="overflow-hidden text-xs text-zinc-400 flex flex-col">
				{#if currentTrack}
					<span
						role="button"
						tabindex="0"
						class="truncate accent-hover-text"
						onclick={(e) => {
							e.stopPropagation();
							goto('/artists/' + currentTrack.artistId);
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.stopPropagation();
								goto('/artists/' + currentTrack.artistId);
							}
						}}
						oncontextmenu={(e) => handleArtistContext(e)}>{currentTrack.artist}</span
					>
					<span
						role="button"
						tabindex="0"
						class="truncate accent-hover-text"
						onclick={(e) => {
							e.stopPropagation();
							goto('/albums/' + currentTrack.album_id);
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.stopPropagation();
								goto('/albums/' + currentTrack.album_id);
							}
						}}
						oncontextmenu={(e) => handleAlbumContext(e)}>{currentTrack.album}</span
					>
				{/if}
			</p>
		</div>
		<button
			onclick={() => {
				if (currentTrack) toggleStar(currentTrack);
			}}
			class="px-1 py-1 rounded-3xl! font-bold flex gap-1 justify-center items-center w-8 h-8 hover:bg-zinc-800"
		>
			{#if favStyle === 'heart'}
				<Heart class="w-4" fill={currentTrack?.starred ? 'currentColor' : 'none'} />
			{:else}
				<Star class="w-4" fill={currentTrack?.starred ? 'currentColor' : 'none'} />
			{/if}</button
		>
	</div>

	<div class="flex flex-1 flex-col items-center gap-1">
		<div class="flex items-center gap-3">
			<Button
				onclick={toggleShuffleMode}
				title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
				class={shuffleMode ? 'accent-text' : 'text-zinc-600 hover:text-zinc-400'}
				variant="ghost"
				size="icon-xs"
				aria-label={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="currentColor"
				>
					<path
						d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
					/>
				</svg>
			</Button>
			<Button
				class="text-zinc-400 hover:text-zinc-100"
				onclick={prevTrack}
				disabled={!currentTrack}
				aria-label="Previous track"
				variant="ghost"
				size="icon"
			>
				<SkipBack class="h-5 w-5" />
			</Button>
			<Button
				class="rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
				onclick={togglePlay}
				disabled={!currentTrack}
				aria-label={playing ? 'Pause' : 'Play'}
				variant="default"
				size="icon"
			>
				{#if playing}
					<Pause class="h-5 w-5" />
				{:else}
					<Play class="h-5 w-5" />
				{/if}
			</Button>
			<Button
				class="text-zinc-400 hover:text-zinc-100"
				onclick={nextTrack}
				disabled={!currentTrack}
				aria-label="Next track"
				variant="ghost"
				size="icon"
			>
				<SkipForward class="h-5 w-5" />
			</Button>
			<Button
				onclick={cycleRepeatMode}
				title={repeatMode === 'off'
					? 'Repeat off'
					: repeatMode === 'queue'
						? 'Repeat queue'
						: 'Repeat track'}
				class={repeatMode === 'off' ? 'text-zinc-600 hover:text-zinc-400' : 'accent-text'}
				variant="ghost"
				size="icon-xs"
				aria-label={repeatMode === 'off'
					? 'Repeat off'
					: repeatMode === 'queue'
						? 'Repeat queue'
						: 'Repeat track'}
			>
				{#if repeatMode === 'track'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
						<circle cx="12" cy="12" r="2.5" fill="currentColor" />
					</svg>
				{:else if repeatMode === 'queue'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
					</svg>
				{/if}
			</Button>
		</div>
		<div class="flex w-full max-w-lg items-center gap-2">
			<span class="w-10 text-right text-xs tabular-nums text-zinc-500">{fmt(currentTime)}</span>
			<input
				type="range"
				min="0"
				max={duration || 0}
				step="0.1"
				value={currentTime}
				oninput={handleSeek}
				class="scrubber h-1 w-full"
				style="--pct: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
			/>
			<span class="w-10 text-left text-xs tabular-nums text-zinc-500">{fmt(duration)}</span>
		</div>
	</div>

	<div class="flex items-center justify-end flex-1">
		<Button
			onclick={() => (showLyrics = !showLyrics)}
			class="text-zinc-400 hover:text-zinc-100 {showLyrics ? 'accent-text' : ''} w-12 h-12"
			title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
			aria-label={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
			variant="ghost"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="lucide lucide-mic-vocal-icon lucide-mic-vocal w-full! h-full!"
				><path
					d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"
				/><path
					d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"
				/><circle cx="16" cy="7" r="5" /></svg
			>
		</Button>
		<div class="flex flex-row items-center">
			<Button
				type="button"
				onclick={toggleMute}
				class="text-zinc-400 w-12 h-12"
				variant="ghost"
				aria-label="Toggle mute"
			>
				{#if mutedState || volume === 0}
					<VolumeX class="h-full! w-full!" />
				{:else}
					<Volume2 class="h-full! w-full!" />
				{/if}
			</Button>
		<input
			type="range"
			min="0"
			max="1"
			step="0.001"
			value={volumeToSlider(volume ?? 0)}
			oninput={handleVolume}
			class="scrubber h-1 w-25"
			style="--pct: {volumeToSlider(volume ?? 0) * 100}%"
		/>
		</div>
	</div>
</div>
<div class="fixed bottom-0 left-0 right-0 z-40 flex justify-center"></div>
<LyricsSidebar visible={showLyrics} onClose={() => (showLyrics = false)} />
<MobileFullPlayer visible={showFullPlayer} onClose={() => (showFullPlayer = false)} />

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
