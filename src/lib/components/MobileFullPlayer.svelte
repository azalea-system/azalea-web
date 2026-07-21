<script lang="ts">
	import { fly } from 'svelte/transition';
	import {
		getCurrentTrack,
		getCurrentTrackId,
		getCurrentTime,
		getDuration,
		isPlaying,
		getUserQueue,
		getNextUp,
		getDisplayedQueue,
		getNextUpLabel,
		togglePlay,
		playNow,
		nextTrack,
		prevTrack,
		getShuffleMode,
		toggleShuffleMode,
		getRepeatMode,
		cycleRepeatMode,
		seek,
		setCurrentTime,
		removeFromQueue,
		queueSongsNext,
		queueSongsEnd
	} from '$lib/stores/player.svelte';
	import { getCoverArtUrl, getLyrics, toggleStar, downloadOnServer, removeSong } from '$lib/api';
	import type { Song } from '$lib/types';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { goto } from '$app/navigation';
	import {
		SkipBack,
		SkipForward,
		Play,
		Pause,
		ChevronDown,
		ListMusic,
		Trash2,
		ListPlus,
		Star,
		Heart
	} from '@lucide/svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import SongRow from '$lib/components/Song.svelte';

	let {
		visible,
		onClose
	}: {
		visible: boolean;
		onClose: () => void;
	} = $props();

	$effect(() => {
		document.body.style.overflow = visible ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	let activeView = $state<'player' | 'lyrics' | 'queue'>('player');
	let slideDir = $state<'up' | 'down'>('up');

	function goToView(view: 'lyrics' | 'queue') {
		slideDir = 'up';
		activeView = view;
	}

	function goBackToPlayer() {
		slideDir = 'down';
		activeView = 'player';
	}

	$effect(() => {
		if (visible) {
			activeView = 'player';
			slideDir = 'up';
		}
	});

	let currentTrack = $derived(getCurrentTrack());
	let currentId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let currentTime = $derived(getCurrentTime());
	let duration = $derived(getDuration());
	let coverError = $state(false);

	$effect(() => {
		coverError = false;
	});

	let shuffleMode = $derived(getShuffleMode());
	let repeatMode = $derived(getRepeatMode());
	let favStyle = $derived(getFavouriteSongStyle());

	function fmt(s: number): string {
		if (isNaN(s) || !isFinite(s) || s === 0) return '0:00';
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	function handleSeek(e: Event) {
		const target = e.target as HTMLInputElement;
		seek(parseFloat(target.value));
	}


	let plainLyrics = $state('');
	let syncedLines = $state<{ time: number; text: string }[]>([]);
	let showSynced = $state(true);
	let lyricsLoading = $state(false);
	let lyricsError = $state(false);
	let lyricsContainer: HTMLDivElement;

	async function fetchLyrics() {
		if (!currentId) return;
		lyricsLoading = true;
		lyricsError = false;
		plainLyrics = '';
		syncedLines = [];
		try {
			const res = await getLyrics(currentId);
			if (res) {
				plainLyrics = res.plainLyrics || '';
				if (res.syncedLyrics) syncedLines = parseLrc(res.syncedLyrics);
			} else {
				lyricsError = true;
			}
		} catch {
			lyricsError = true;
		} finally {
			lyricsLoading = false;
		}
	}

	$effect(() => {
		if (currentId && activeView === 'lyrics') fetchLyrics();
	});

	function parseLrc(lrc: string): { time: number; text: string }[] {
		const lines: { time: number; text: string }[] = [];
		const re = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/g;
		let match: RegExpExecArray | null;
		while ((match = re.exec(lrc)) !== null) {
			const min = parseInt(match[1]);
			const sec = parseInt(match[2]);
			let ms = parseInt(match[3]);
			if (match[3].length === 2) ms *= 10;
			const time = min * 60 + sec + ms / 1000;
			const text = match[4].trim();
			if (text) lines.push({ time, text });
		}
		lines.sort((a, b) => a.time - b.time);
		return lines;
	}

	let currentLineIndex = $derived.by(() => {
		if (!syncedLines.length) return -1;
		let idx = syncedLines.length - 1;
		for (let i = 0; i < syncedLines.length; i++) {
			if (currentTime < syncedLines[i].time) {
				idx = i - 1;
				break;
			}
		}
		return idx;
	});

	let prevLineIndex = $state(-1);

	$effect(() => {
		if (currentLineIndex !== prevLineIndex && lyricsContainer) {
			prevLineIndex = currentLineIndex;
			const el = lyricsContainer.querySelector(`[data-lyric-idx="${currentLineIndex}"]`);
			if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	});


	let rafId: number | null = null;

	$effect(() => {
		if (visible && (activeView === 'player' || activeView === 'lyrics')) {
			function tick() {
				const audioEl = document.querySelector('audio');
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


	let displayedQueue = $derived(getDisplayedQueue());
	let nextUp = $derived(getNextUp());
	let queueLabel = $derived(getNextUpLabel());

	let ctxMenu = $state<{
		x: number;
		y: number;

		items: { label: string; icon?: any; action: () => void }[];
	} | null>(null);

	function openSongContext(e: MouseEvent, song: Song) {
		e.preventDefault();
		e.stopPropagation();
		const items = [];
		items.push({ label: 'Play next', icon: ListPlus, action: () => queueSongsNext([song]) });
		items.push({ label: 'Add to queue', icon: ListMusic, action: () => queueSongsEnd([song]) });
		ctxMenu = { x: e.clientX, y: e.clientY, items } as any;
	}


	let touchStartY = $state(0);
	let touchDeltaY = $state(0);
	let isSwiping = $state(false);

	function handleTouchStart(e: TouchEvent) {
		if (activeView !== 'player') return;
		touchStartY = e.touches[0].clientY;
		touchDeltaY = 0;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping || activeView !== 'player') return;
		const dy = e.touches[0].clientY - touchStartY;
		if (dy > 0) {
			touchDeltaY = dy;
			e.preventDefault();
		}
	}

	function handleTouchEnd() {
		if (!isSwiping || activeView !== 'player') return;
		isSwiping = false;
		if (touchDeltaY > 100) {
			onClose();
		}
		touchDeltaY = 0;
	}
</script>

{#if visible}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-zinc-950"
		transition:fly={{ y: '100%', duration: 300 }}
		style={isSwiping && activeView === 'player'
			? `transform: translateY(${touchDeltaY}px)`
			: ''}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{#if activeView === 'player'}
			<div
				in:fly={{ y: slideDir === 'down' ? '-100%' : '100%', duration: 200 }}
				out:fly={{ y: slideDir === 'down' ? '100%' : '-100%', duration: 200 }}
				class="flex flex-1 flex-col"
			>

				<div class="flex items-center justify-between px-4 pt-12 pb-2">
					<button
						onclick={onClose}
						class="text-zinc-400 transition-colors hover:text-zinc-100"
						aria-label="Close"
					>
						<ChevronDown class="h-6 w-6" />
					</button>
					<p class="text-xs font-medium uppercase tracking-wider text-zinc-500">Now Playing</p>
					<div class="w-6" />
				</div>

				<div class="h-full">

					<div class="flex justify-center px-6 mt-4 mb-6">
						<button
							onclick={() => {
								onClose();
								goto('/albums/' + currentTrack?.albumId);
							}}
							disabled={!currentTrack}
							class="w-full max-w-sm"
						>
							{#if currentTrack && !coverError}
								<img
									src={getCoverArtUrl(currentTrack.coverArt, 512)}
									alt={currentTrack.title}
									class="aspect-square w-full rounded-lg object-cover shadow-2xl"
									onerror={() => (coverError = true)}
								/>
							{:else}
								<div
									class="flex aspect-square w-full items-center justify-center rounded-lg bg-zinc-800"
								>
									<svg class="h-24 w-24 text-zinc-600" viewBox="0 0 24 24" fill="currentColor"
										><path
											d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"
										/></svg
									>
								</div>
							{/if}
						</button>
					</div>
				</div>


				<div class="flex flex-col">

					<div class="px-6 mb-4">
						<p class="truncate text-lg font-semibold text-zinc-100">
							{currentTrack?.title ?? 'No track playing'}
						</p>
						{#if currentTrack}
							<button
								onclick={() => {
									onClose();
									goto('/artists/' + currentTrack.artistId);
								}}
								class="truncate text-sm text-zinc-400 accent-hover-text"
							>
								{currentTrack.artist}
							</button>
						{/if}
					</div>


					<div class="px-6 mb-6 flex gap-2 flex items-center justify-center">
						<button
							onclick={() => {
								if (currentTrack) toggleStar(currentTrack);
							}}
							class="bg-zinc-900 px-4 py-1 rounded-3xl! font-bold flex gap-1 justify-center items-center"
						>
							{#if favStyle === 'heart'}
								<Heart class="w-4" fill={currentTrack?.starred ? 'currentColor' : 'none'} />
								Like
							{:else}
								<Star class="w-4" fill={currentTrack?.starred ? 'currentColor' : 'none'} />
								Star
							{/if}</button
						>
						<button
							class="bg-zinc-900 px-4 py-1 rounded-3xl! font-bold flex gap-1 justify-center items-center"
						>
							<ListPlus class="w-4" />
							Save</button
						>
						{#if currentTrack?.path}
							<button
								onclick={() => {
									if (currentTrack) {
										removeSong(currentTrack.id);
										currentTrack.path = '';
									}
								}}
								class="bg-zinc-900 px-4 py-1 rounded-3xl! font-bold flex gap-1 justify-center items-center"
							>
								<Trash2 class="w-4" />
								Remove</button
							>
						{:else}
							<button
								onclick={() => {
									if (currentTrack) downloadOnServer(currentTrack.id);
								}}
								class="bg-zinc-900 px-4 py-1 rounded-3xl! font-bold flex gap-1 justify-center items-center"
							>
								<ListPlus class="w-4" />
								Download</button
							>
						{/if}
					</div>


					<div class="flex items-center gap-3 mb-8">
						<span class="w-10 text-right text-xs tabular-nums text-zinc-500"
							>{fmt(currentTime)}</span
						>
						<input
							type="range"
							min="0"
							max={duration || 0}
							step="0.1"
							value={currentTime}
							oninput={handleSeek}
							class="scrubber h-1 flex-1"
							style="--pct: {duration > 0 ? (currentTime / duration) * 100 : 0}%"
						/>
						<span class="w-10 text-left text-xs tabular-nums text-zinc-500">{fmt(duration)}</span>
					</div>


					<div class="flex items-center justify-center pb-3 gap-8">
						<button
							onclick={toggleShuffleMode}
							title={shuffleMode ? 'Shuffle on' : 'Shuffle off'}
							class="transition-colors disabled:opacity-30 {shuffleMode
								? 'accent-text'
								: 'text-zinc-600 hover:text-zinc-400'}"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="currentColor"
							>
								<path
									d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"
								/>
							</svg>
						</button>
						<div class="flex gap-7">
							<button
								class="text-zinc-400 transition-colors hover:text-zinc-100"
								onclick={prevTrack}
								disabled={!currentTrack}
								aria-label="Previous track"
							>
								<SkipBack class="h-9 w-9" />
							</button>
							<button
								onclick={togglePlay}
								disabled={!currentTrack}
								class="flex h-17 w-17 items-center justify-center rounded-full bg-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-300 disabled:opacity-30"
								aria-label={playing ? 'Pause' : 'Play'}
							>
								{#if playing}
									<Pause class="h-10 w-10" />
								{:else}
									<Play class="h-10 w-10" />
								{/if}
							</button>
							<button
								class="text-zinc-400 transition-colors hover:text-zinc-100"
								onclick={nextTrack}
								disabled={!currentTrack}
								aria-label="Next track"
							>
								<SkipForward class="h-9 w-9" />
							</button>
						</div>
						<button
							onclick={cycleRepeatMode}
							title={repeatMode === 'off'
								? 'Repeat off'
								: repeatMode === 'queue'
									? 'Repeat queue'
									: 'Repeat track'}
							class="transition-colors disabled:opacity-30 {repeatMode === 'off'
								? 'text-zinc-600 hover:text-zinc-400'
								: 'accent-text'}"
						>
							{#if repeatMode === 'track'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
									<circle cx="12" cy="12" r="2.5" fill="currentColor" />
								</svg>
							{:else if repeatMode === 'queue'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
								</svg>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
								</svg>
							{/if}
						</button>
					</div>

					<div class="flex items-end mt-10">
						<button
							onclick={() => goToView('lyrics')}
							class="flex flex-1 flex-col items-center gap-1 py-4 text-[10px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-200"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-mic-vocal-icon lucide-mic-vocal"
								><path
									d="m11 7.601-5.994 8.19a1 1 0 0 0 .1 1.298l.817.818a1 1 0 0 0 1.314.087L15.09 12"
								/><path
									d="M16.5 21.174C15.5 20.5 14.372 20 13 20c-2.058 0-3.928 2.356-6 2-2.072-.356-2.775-3.369-1.5-4.5"
								/><circle cx="16" cy="7" r="5" /></svg
							>
							Lyrics
						</button>
						<div class="h-[85%] w-px bg-zinc-800" />
						<button
							onclick={() => goToView('queue')}
							class="flex flex-1 flex-col items-center gap-1 py-4 text-[10px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-200"
						>
							<ListMusic class="h-5 w-5" />
							Queue
						</button>
					</div>
				</div>
			</div>
		{:else if activeView === 'lyrics'}
			<div
				in:fly={{ y: slideDir === 'down' ? '-100%' : '100%', duration: 200 }}
				out:fly={{ y: slideDir === 'down' ? '100%' : '-100%', duration: 200 }}
				class="flex min-h-0 flex-1 flex-col"
			>

				<div class="flex items-center gap-4 border-b border-zinc-800 px-4 pt-12 pb-3">
					<button
						onclick={goBackToPlayer}
						class="text-zinc-400 transition-colors hover:text-zinc-100"
						aria-label="Back to player"
					>
						<ChevronDown class="h-6 w-6" />
					</button>
					<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Lyrics</h2>
					<button
						onclick={() => (showSynced = !showSynced)}
						class="ml-auto rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider transition-colors {showSynced
							? 'accent-bg text-white'
							: 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}"
					>
						{showSynced ? 'Synced' : 'Plain'}
					</button>
				</div>
				<div bind:this={lyricsContainer} class="flex-1 overflow-y-auto px-6 py-4">
					{#if lyricsLoading}
						<div class="flex items-center justify-center py-12 text-sm text-zinc-500">
							Loading lyrics...
						</div>
					{:else if showSynced && syncedLines.length > 0}
						<div class="space-y-3 px-4 font-bold mb-5">
							{#each syncedLines as line, i (line.time)}
								{#if i === currentLineIndex}
									<p
										data-lyric-idx={i}
										class="accent-text text-xl leading-relaxed transition-all duration-300 cursor-pointer"
										onclick={() => seek(line.time)}
									>
										{line.text}
									</p>
								{:else if i < currentLineIndex}
									<p
										data-lyric-idx={i}
										class="text-xl leading-relaxed text-zinc-600 transition-all duration-300 cursor-pointer"
										onclick={() => seek(line.time)}
									>
										{line.text}
									</p>
								{:else}
									<p
										data-lyric-idx={i}
										class="text-xl leading-relaxed text-zinc-400 transition-all duration-300 cursor-pointer"
										onclick={() => seek(line.time)}
									>
										{line.text}
									</p>
								{/if}
							{/each}
						</div>
					{:else if plainLyrics}
						<div class="space-y-2 mb-5">
							{#each plainLyrics.split('\n') as line, i (i)}
								{#if line.trim()}
									<p class="text-sm text-zinc-300">{line.trim()}</p>
								{/if}
							{/each}
						</div>
					{:else}
						<div
							class="flex flex-col items-center justify-center gap-3 py-12 text-sm text-zinc-500"
						>
							<span>No lyrics found</span>
							<button
								onclick={fetchLyrics}
								class="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
							>
								Try again
							</button>
						</div>
					{/if}
					{#if plainLyrics || syncedLines.length}
						<span class="px-4 font-bold text-sm text-neutral-700">Lyrics provided by LRCLIB</span>
					{/if}
				</div>
			</div>
		{:else if activeView === 'queue'}
			<div
				in:fly={{ y: slideDir === 'down' ? '-100%' : '100%', duration: 200 }}
				out:fly={{ y: slideDir === 'down' ? '100%' : '-100%', duration: 200 }}
				class="flex flex-1 flex-col"
			>

				<div class="flex items-center gap-4 border-b border-zinc-800 px-4 pt-12 pb-3">
					<button
						onclick={goBackToPlayer}
						class="text-zinc-400 transition-colors hover:text-zinc-100"
						aria-label="Back to player"
					>
						<ChevronDown class="h-6 w-6" />
					</button>
					<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Queue</h2>
				</div>
				<div class="flex-1 overflow-y-auto px-4 py-2">
					{#if displayedQueue.length === 0 && nextUp.length === 0}
						<div class="flex items-center justify-center py-12 text-sm text-zinc-500">
							Queue is empty
						</div>
					{:else}
						{#if displayedQueue.length > 0}
							<p class="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
								Now Playing
							</p>
							{#each displayedQueue as song, i (song.id)}
								<SongRow
									{song}
									coverSize="sm"
									showRemove
									isCurrent={i === 0}
									isPlaying={i === 0 && playing}
									onplay={(s) => playNow(s, displayedQueue)}
									onremove={(s) => {
										const idx = displayedQueue.findIndex((q) => q.id === s.id);
										if (idx >= 0) removeFromQueue(idx);
									}}
									oncontext={(e, s) => openSongContext(e, s)}
								/>
							{/each}
						{/if}
						{#if nextUp.length > 0}
							<p class="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
								{queueLabel || 'Next Up'}
							</p>
							{#each nextUp as song (song.id)}
								<SongRow
									{song}
									coverSize="sm"
									onplay={(s) => playNow(s)}
									oncontext={(e, s) => openSongContext(e, s)}
								/>
							{/each}
						{/if}
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
