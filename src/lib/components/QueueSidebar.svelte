<script lang="ts">
	import {
		getCurrentTrack,
		getUserQueue,
		getNextFromAlbum,
		getNextUp,
		getNextUpLabel,
		getNextFromLabel,
		getCurrentTrackId,
		isPlaying,
		removeFromQueue,
		queueSongsNext,
		queueSongsEnd,
		moveInQueue
	} from '$lib/stores/player.svelte';
	import { getDisplayedQueue } from '$lib/stores/player.svelte';
	import {
		getQueueSidebarWidth,
		setQueueSidebarWidth,
		getQueueSidebarCollapsed,
		setQueueSidebarCollapsed,
		getEffectiveSidebarWidth
	} from '$lib/stores/layout.svelte';
	import { goto } from '$app/navigation';
	import SongRow from '$lib/components/Song.svelte';
	import { ListPlus, ListMusic, Trash2, Copy, User, Disc } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ContextMenu from '$lib/components/ContextMenu.svelte';

	type IconConstructor = new (...args: any[]) => any;

	let collapsed = $derived(getQueueSidebarCollapsed());
	let width = $derived(getQueueSidebarWidth());
	let effectiveWidth = $derived(getEffectiveSidebarWidth());
	let isResizing = $state(false);

	let currentTrack = $derived(getCurrentTrack());
	let userQueue = $derived(getUserQueue());
	let displayedQueue = $derived(getDisplayedQueue());
	let nextFromAlbum = $derived(getNextFromAlbum());
	let nextUp = $derived(getNextUp());
	let queueLabel = $derived(getNextUpLabel());
	let nextFromLabel = $derived(getNextFromLabel());
	let currentId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: IconConstructor; action: () => void }[];
	} | null>(null);

	let draggedSong = $state<any>(null);
	let dragSource = $state<'user' | 'nextFrom' | 'nextUp'>('user');
	let dropSection = $state<'user' | 'nextFrom' | 'nextUp' | null>(null);
	let dropIndex = $state(-1);

	function handleDragStart(e: DragEvent, song: any, source: 'user' | 'nextFrom' | 'nextUp') {
		draggedSong = song;
		dragSource = source;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', song.id);
		}
	}

	function handleDragEnd() {
		draggedSong = null;
		dragSource = 'user';
		dropSection = null;
		dropIndex = -1;
	}

	function handleDragOverSection(e: DragEvent, section: 'user' | 'nextFrom' | 'nextUp', songs: any[]) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dropSection = section;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const itemH = 40;
		const gap = 20;
		let idx = Math.floor((y + gap / 2) / (itemH + gap));
		idx = Math.max(0, Math.min(songs.length, idx));
		dropIndex = idx;
	}

	function handleDrop(e: DragEvent, section: 'user' | 'nextFrom' | 'nextUp') {
		e.preventDefault();
		if (!draggedSong) return;
		const song = draggedSong;
		moveInQueue(song, dragSource, dropIndex);
		draggedSong = null;
		dragSource = 'user';
		dropSection = null;
		dropIndex = -1;
	}

	function handleArtistContext(e: MouseEvent, artist: string) {
		e.preventDefault();
		e.stopPropagation();
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{ label: 'Copy name', icon: Copy, action: () => navigator.clipboard.writeText(artist) }
			]
		};
	}

	function toggleCollapse() {
		setQueueSidebarCollapsed(!collapsed);
	}

	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		const startX = e.clientX;
		const startWidth = width;

		function onMouseMove(ev: MouseEvent) {
			const newWidth = startWidth + (startX - ev.clientX);
			setQueueSidebarWidth(Math.max(200, Math.min(500, newWidth)));
		}

		function onMouseUp() {
			isResizing = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	function fmtDuration(seconds: number): string {
		if (!seconds || isNaN(seconds)) return '0:00';
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}

	function isCurrentSong(songId: string) {
		return currentId === songId;
	}

	import { playNow } from '$lib/stores/player.svelte';

	function openSongContext(e: MouseEvent, song: any, index: number | null, location: string) {
		e.preventDefault();
		e.stopPropagation();
		const items = [];
		items.push({ label: 'Play next', icon: ListPlus, action: () => queueSongsNext([song]) });
		items.push({ label: 'Add to queue', icon: ListMusic, action: () => queueSongsEnd([song]) });
		if (location === 'user' && index !== null) {
			items.push({
				label: 'Remove from queue',
				icon: Trash2,
				action: () => removeFromQueue(index)
			});
		}
		items.push({
			label: 'Copy name',
			icon: Copy,
			action: () => navigator.clipboard.writeText(song.title)
		});
		items.push({
			label: 'Go to album',
			icon: Disc,
			action: () => goto('/albums/' + song.album_id)
		});
		items.push({
			label: 'Go to artist',
			icon: User,
			action: () => goto('/artists/' + song.artistId)
		});
		ctxMenu = { x: e.clientX, y: e.clientY, items };
	}
</script>

{#if collapsed}
	<div
		role="button"
		tabindex="0"
		onclick={toggleCollapse}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') toggleCollapse();
		}}
		class="fixed right-0 top-0 z-40 flex h-full w-8 cursor-pointer items-center justify-center border border-zinc-800 bg-zinc-950/70 backdrop-blur-sm text-zinc-400 transition-colors hover:text-zinc-100 bottom-24 lg:bottom-20"
		title="Show queue"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
			><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg
		>
	</div>
{:else}
	<div
		class="fixed right-0 top-0 z-40 flex flex-col border-l border-zinc-800 bg-zinc-950/70 backdrop-blur-sm bottom-24 lg:bottom-20"
		style="width: {width}px"
	>
		<div
			role="separator"
			tabindex="0"
			class="absolute left-0 top-0 bottom-0 z-10 w-1 cursor-col-resize hover:accent-bg-medium {isResizing
				? 'accent-bg-medium'
				: ''}"
			onmousedown={startResize}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft') setQueueSidebarWidth(Math.max(200, width - 20));
				if (e.key === 'ArrowRight') setQueueSidebarWidth(Math.min(500, width + 20));
			}}
		></div>

		<Button
			variant="ghost"
			class="flex items-center justify-between border-b border-zinc-800 px-3 h-12 rounded-none border-x-0"
			onclick={toggleCollapse}
		>
			<h2 class="text-xs font-semibold uppercase tracking-wider text-zinc-400">Queue</h2>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="currentColor"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" /></svg
			>
		</Button>

		<div class="flex-1 overflow-y-auto">
			{#if displayedQueue.length > 0}
				<div
					class="space-y-0.5 px-1 pt-1"
					ondragover={(e) => handleDragOverSection(e, 'user', displayedQueue)}
					ondrop={(e) => handleDrop(e, 'user')}
				>
					{#each displayedQueue as song, i (song.id)}
						{#if i > 0 && dropSection === 'user' && dropIndex === i}
							<div class="h-0.5 rounded-full bg-accent mx-2"></div>
						{/if}
						<div class="select-auto transition-opacity {draggedSong?.id === song.id ? 'opacity-40' : ''}">
							<SongRow
								{song}
								coverSize="xs"
								showStar={false}
								showDuration={true}
								isCurrent={isCurrentSong(song.id)}
								isPlaying={playing}
								showRemove={i > 0}
								draggable={i > 0}
								ondragstart={(e) => i > 0 ? handleDragStart(e, song, 'user') : undefined}
								ondragend={handleDragEnd}
								onplay={(s) => playNow(s, displayedQueue)}
								oncontext={(e, s) => {
									const idx = displayedQueue.findIndex((q) => q.id === s.id);
									openSongContext(e, s, idx, 'user');
								}}
								onartistcontext={(e, s) => handleArtistContext(e, s.artist)}
								onremove={(s) => {
									const idx = displayedQueue.findIndex((q) => q.id === s.id);
									if (idx > 0) removeFromQueue(idx - 1);
								}}
								class="px-2 py-1.5"
							/>
						</div>
					{/each}
					{#if dropSection === 'user' && dropIndex === displayedQueue.length}
						<div class="h-0.5 rounded-full bg-accent mx-2"></div>
					{/if}
				</div>
			{/if}

			{#if nextFromAlbum.length > 0}
				<div class="px-3 py-1.5">
					<p class="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
						{nextFromLabel}
					</p>
				</div>
				<div
					class="space-y-0.5 px-1"
					ondragover={(e) => handleDragOverSection(e, 'nextFrom', nextFromAlbum)}
					ondrop={(e) => handleDrop(e, 'nextFrom')}
				>
					{#each nextFromAlbum as song, i (song.id)}
						{#if i > 0 && dropSection === 'nextFrom' && dropIndex === i}
							<div class="h-0.5 rounded-full bg-accent mx-2"></div>
						{/if}
						<div class="select-auto transition-opacity {draggedSong?.id === song.id ? 'opacity-40' : ''}">
							<SongRow
								{song}
								coverSize="xs"
								showStar={false}
								showDuration={true}
								isCurrent={isCurrentSong(song.id)}
								isPlaying={playing}
								draggable={true}
								ondragstart={(e) => handleDragStart(e, song, 'nextFrom')}
								ondragend={handleDragEnd}
								onplay={(s) => playNow(s, [...nextFromAlbum, ...nextUp])}
								oncontext={(e, s) => openSongContext(e, s, null, 'nextFrom')}
								onartistcontext={(e, s) => handleArtistContext(e, s.artist)}
								class="px-2 py-1.5"
							/>
						</div>
					{/each}
					{#if dropSection === 'nextFrom' && dropIndex === nextFromAlbum.length}
						<div class="h-0.5 rounded-full bg-accent mx-2"></div>
					{/if}
				</div>
			{/if}

			{#if nextUp.length > 0}
				<div class="px-3 py-1.5">
					<p class="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{queueLabel}</p>
				</div>
				<div
					class="space-y-0.5 px-1 pb-2"
					ondragover={(e) => handleDragOverSection(e, 'nextUp', nextUp)}
					ondrop={(e) => handleDrop(e, 'nextUp')}
				>
					{#each nextUp as song, i (song.id)}
						{#if i > 0 && dropSection === 'nextUp' && dropIndex === i}
							<div class="h-0.5 rounded-full bg-accent mx-2"></div>
						{/if}
						<div class="select-auto transition-opacity {draggedSong?.id === song.id ? 'opacity-40' : ''}">
							<SongRow
								{song}
								coverSize="xs"
								showStar={false}
								showDuration={false}
								isCurrent={isCurrentSong(song.id)}
								isPlaying={playing}
								draggable={true}
								ondragstart={(e) => handleDragStart(e, song, 'nextUp')}
								ondragend={handleDragEnd}
								onplay={(s) => playNow(s)}
								oncontext={(e, s) => openSongContext(e, s, null, 'nextUp')}
								onartistcontext={(e, s) => handleArtistContext(e, s.artist)}
								class="px-2 py-1.5"
							/>
						</div>
					{/each}
					{#if dropSection === 'nextUp' && dropIndex === nextUp.length}
						<div class="h-0.5 rounded-full bg-accent mx-2"></div>
					{/if}
				</div>
			{/if}

			{#if !currentTrack && userQueue.length === 0 && nextUp.length === 0}
				<div class="flex items-center justify-center py-16 text-xs text-zinc-600">
					Nothing in queue
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if isResizing}
	<div class="fixed inset-0 z-30 cursor-col-resize"></div>
{/if}

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
