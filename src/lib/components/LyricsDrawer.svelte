<script lang="ts">
	import { getEffectiveSidebarWidth } from '$lib/stores/layout.svelte';
	import { getLyrics } from '$lib/api';
	import {
		getCurrentTrack,
		getCurrentTrackId,
		getCurrentTime,
		seek
	} from '$lib/stores/player.svelte';
	import { Maximize2, Minimize2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let { visible, onClose }: { visible: boolean; onClose: () => void } = $props();

	let currentTrack = $derived(getCurrentTrack());
	let currentId = $derived(getCurrentTrackId());
	let currentTime = $derived(getCurrentTime());

	let plainLyrics = $state('');
	let syncedLines = $state<{ time: number; text: string }[]>([]);
	let showSynced = $state(true);
	let delay = $state(0);
	let loading = $state(false);
	let error = $state(false);

	let lyricsContainer: HTMLDivElement;
	let isResizing = $state(false);
	let heightVh = $state(45);
	let maximized = $state(false);
	let effectiveSidebarWidth = $derived(getEffectiveSidebarWidth());

	async function fetchLyrics() {
		if (!currentId) return;
		loading = true;
		error = false;
		plainLyrics = '';
		syncedLines = [];
		try {
			const res = await getLyrics(currentId);
			if (res) {
				plainLyrics = res.plainLyrics || '';
				if (res.syncedLyrics) {
					syncedLines = parseLrc(res.syncedLyrics);
				}
			} else {
				error = true;
			}
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (currentId) {
			fetchLyrics();
		}
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
		const adjustedTime = currentTime + delay / 1000;
		let idx = syncedLines.length - 1;
		for (let i = 0; i < syncedLines.length; i++) {
			if (adjustedTime < syncedLines[i].time) {
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
			if (el) {
				el.scrollIntoView({ block: 'center', behavior: 'smooth' });
			}
		}
	});

	function _handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && visible) {
			const target = e.target as HTMLElement;
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
				return;
			}
			onClose();
		}
	}

	$effect(() => {
		window.addEventListener('keydown', _handleKeydown);
		return () => window.removeEventListener('keydown', _handleKeydown);
	});

	function getMaxHeight() {
		return 100 - (80 / window.innerHeight) * 100;
	}

	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		const startY = e.clientY;
		const startH = heightVh;

		function onMouseMove(ev: MouseEvent) {
			const dy = startY - ev.clientY;
			const vhHeight = Math.min(
				getMaxHeight(),
				Math.max(20, startH + (dy / window.innerHeight) * 100)
			);
			heightVh = Math.round(vhHeight);
			if (heightVh >= getMaxHeight()) {
				maximized = true;
			} else {
				maximized = false;
			}
		}

		function onMouseUp() {
			isResizing = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	let heightBeforeMaximize = $state(heightVh);

	function toggleMaximize() {
		if (maximized) {
			heightVh = heightBeforeMaximize;
			maximized = false;
		} else {
			heightBeforeMaximize = heightVh;
			heightVh = getMaxHeight();
			maximized = true;
		}
	}

	import { onMount } from 'svelte';
	onMount(() => {
		toggleMaximize();
	});
</script>

{#if visible}
	
	<div
		role="dialog"
		aria-label="Lyrics"
		class="fixed bottom-20 z-40 bg-zinc-950/95 backdrop-blur pb-9 max-[1023px]:hidden"
		style="height: {heightVh}vh; max-height: calc(100vh - 80px); left: 224px; right: {effectiveSidebarWidth}px;"
	>
		<div class="border-y border-zinc-800 h-12">
			<div
				onmousedown={startResize}
				ondblclick={toggleMaximize}
				class="cursor-row-resize {isResizing
					? 'bg-zinc-800'
					: ''} flex flex-col justify-center p-0!"
				title="Drag to resize"
				role="dialog"
				tabindex="0"
			>
				<div class="flex items-center justify-between hover:bg-zinc-800/50">
					<div class="flex items-center gap-2 pl-2 py-2 flex-1">
						<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">
							{currentTrack?.title ? 'Lyrics - ' + currentTrack.title : 'Lyrics'}
						</h2>
						<Button
							variant={showSynced ? 'default' : 'ghost'}
							size="sm"
							onmousedown={(e) => e.stopPropagation()}
							onclick={() => (showSynced = !showSynced)}
							title={showSynced ? 'Showing synced lyrics' : 'Showing plain lyrics'}
							class="px-2 py-0.5 h-5 text-[10px] uppercase tracking-wider"
						>
							{showSynced ? 'Synced' : 'Plain'}
						</Button>
						<div
							onmousedown={(e) => e.stopPropagation()}
							class="flex gap-2 items-center justify-center"
						>
							<Label for="delay" class="text-zinc-700 text-[0.65rem] font-bold uppercase"
								>Delay (ms)</Label
							>
							<Input
								id="delay"
								type="number"
								bind:value={delay}
								step="100"
								oninput={(e) => (delay = parseFloat(e.currentTarget.value))}
								class="w-19 text-xs h-[1.25rem]! font-mono"
							/>
						</div>
					</div>
					
					<div class="h-1 w-10 rounded-full bg-zinc-700" />
					<div class="flex items-center gap-2 flex-1 justify-end pr-2 py-2">
						<span class="text-zinc-700 font-bold text-xs">[esc] to close</span>
						<Button variant="ghost" size="icon-sm" onclick={toggleMaximize} class="text-zinc-500">
							{#if maximized}
								<Maximize2 class="h-4 w-4" />
							{:else}
								<Minimize2 class="h-4 w-4" />
							{/if}
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onmousedown={(e) => e.stopPropagation()}
							onclick={onClose}
							title="Close lyrics"
							class="text-zinc-500"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								viewBox="0 0 24 24"
								fill="currentColor"
								><path
									d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
								/></svg
							>
						</Button>
					</div>
				</div>
			</div>
		</div>
		<div bind:this={lyricsContainer} class="h-full overflow-y-auto px-6 py-4">
			{#if loading}
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
								onclick={(e) => {
									e.stopPropagation();
									seek(line.time);
								}}
							>
								{line.text}
							</p>
						{:else if i < currentLineIndex}
							<p
								data-lyric-idx={i}
								class="text-xl leading-relaxed text-zinc-600 transition-all duration-300 cursor-pointer"
								onclick={(e) => {
									e.stopPropagation();
									seek(line.time);
								}}
							>
								{line.text}
							</p>
						{:else}
							<p
								data-lyric-idx={i}
								class="text-xl leading-relaxed text-zinc-400 transition-all duration-300 cursor-pointer"
								onclick={(e) => {
									e.stopPropagation();
									seek(line.time);
								}}
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
				<div class="flex flex-col items-center justify-center gap-3 py-12 text-sm text-zinc-500">
					<span>No lyrics found</span>
					<Button variant="outline" size="sm" onclick={fetchLyrics}>Try again</Button>
				</div>
			{/if}
			{#if plainLyrics || syncedLines.length}
				<span class="px-4 font-bold text-sm text-neutral-700">Lyrics provided by LRCLIB</span>
			{/if}
		</div>
	</div>
{/if}
