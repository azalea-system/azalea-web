<script lang="ts">
	import { onMount, type ComponentType } from 'svelte';
	import { slide, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { Disc } from '@lucide/svelte';
	import { getAlbum, getCoverArtUrl, downloadAlbumOnServer, toggleStar } from '$lib/api';
	import { titleEnding, getAlbumPageActionButtonsStyle } from '$lib/stores/settings.svelte';
	import { playNow, getCurrentTrackId, isPlaying } from '$lib/stores/player.svelte';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { Download, MoreHorizontal, Copy, User, Settings, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Songs from '$lib/components/Songs.svelte';
	import type { Album, Song } from '$lib/types';

	let album = $state<Album | null>(null);
	let loading = $state(true);

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let favStyle = $derived(getFavouriteSongStyle());
	let downloadedCount = $derived(album?.song?.filter((s) => s.path).length ?? 0);

	let discGroups = $derived.by(() => {
		if (!album?.song) return [];
		const groups: { disc: number; songs: Song[] }[] = [];
		for (const song of album.song) {
			const d = song.discNumber || 1;
			let group = groups.find((g) => g.disc === d);
			if (!group) {
				group = { disc: d, songs: [] };
				groups.push(group);
			}
			group.songs.push(song);
		}
		return groups.sort((a, b) => a.disc - b.disc);
	});

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: ComponentType; action: () => void; disabled?: boolean }[];
	} | null>(null);

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;
		try {
			album = await getAlbum(id);
		} catch (e) {
			console.error('Failed to fetch album', e);
		} finally {
			loading = false;
		}
	});

	function handlePlayAll() {
		if (album?.song && album.song.length > 0) {
			playNow(album.song[0], album.song);
		}
	}

	function handlePlaySong(song: Song) {
		if (album?.song) {
			playNow(song, album.song);
		} else {
			playNow(song);
		}
	}

	function copy(t: string) {
		navigator.clipboard.writeText(t);
	}

	function handleAlbumContext(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (!album) return;
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{ label: 'Copy title', icon: Copy, action: () => copy(album!.name) },
				{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + album!.artistId) }
			]
		};
	}

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}

	let downloadingAll = $state(false);

	async function handleDownloadAll() {
		if (!album) return;
		downloadingAll = true;
		try {
			await downloadAlbumOnServer(album.id);
		} catch {
		} finally {
			downloadingAll = false;
		}
	}

	let showLightbox = $state(false);
	let lightboxScale = $state(1);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragOffsetX = $state(0);
	let dragOffsetY = $state(0);
	let didDrag = $state(false);
	let showHint = $state(true);

	function openLightbox() {
		showLightbox = true;
		lightboxScale = 1;
		offsetX = 0;
		offsetY = 0;
		showHint = true;
	}

	function dismissHint() {
		showHint = false;
	}

	function closeLightbox() {
		showLightbox = false;
	}

	function toggleZoom(e: MouseEvent) {
		e.stopPropagation();
		if (lightboxScale > 1) {
			lightboxScale = 1;
			offsetX = 0;
			offsetY = 0;
		} else {
			lightboxScale = 2;
			offsetX = 0;
			offsetY = 0;
		}
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const mx = e.clientX - rect.left - rect.width / 2 - offsetX;
		const my = e.clientY - rect.top - rect.height / 2 - offsetY;
		const delta = -e.deltaY * 0.001;
		const newScale = Math.max(0.5, Math.min(10, lightboxScale * (1 + delta)));
		const ratio = newScale / lightboxScale;
		offsetX = mx - ratio * mx;
		offsetY = my - ratio * my;
		lightboxScale = newScale;
	}

	function startDrag(e: MouseEvent) {
		if (lightboxScale <= 1) return;
		isDragging = true;
		didDrag = false;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragOffsetX = offsetX;
		dragOffsetY = offsetY;
	}

	function doDrag(e: MouseEvent) {
		if (!isDragging) return;
		offsetX = dragOffsetX + (e.clientX - dragStartX);
		offsetY = dragOffsetY + (e.clientY - dragStartY);
		if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) {
			didDrag = true;
		}
	}

	function stopDrag() {
		isDragging = false;
	}

	let showSettings = $state(false);
</script>

<svelte:head>
	<title>{album?.name ?? 'Album'}{titleEnding}</title>
</svelte:head>

<div class="p-6 max-lg:px-1">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else if album}
		<div class="mb-8 flex flex-col items-center gap-6 sm:flex-row sm:items-end">
			<div class="flex w-full justify-center sm:w-auto sm:justify-start">
				<button
					tabindex="0"
					onclick={openLightbox}
					oncontextmenu={(e) => handleAlbumContext(e)}
					class="relative flex h-48 w-48 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-zinc-700"
				>
					<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-16 w-16"
							viewBox="0 0 24 24"
							fill="currentColor"
							><path
								d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"
							/></svg
						>
					</div>
					<img
						src={getCoverArtUrl(album.coverArt, 256)}
						alt={album.name}
						class="relative h-full w-full object-cover"
						onerror={hideImg}
					/>
				</button>
			</div>
			<div class="min-w-0 text-center sm:text-left max-sm:w-full">
				<p class="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Album</p>
				<h1
					oncontextmenu={(e) => handleAlbumContext(e)}
					class="mb-2 truncate text-3xl font-bold text-zinc-100"
				>
					{album.name}
				</h1>
				<a
					href="/artists/{album.artistId}"
					oncontextmenu={(e) => handleAlbumContext(e)}
					class="block truncate text-sm accent-text accent-hover-text"
				>
					{album.artist}
				</a>
				<p class="mt-1 text-sm text-zinc-400">
					{album.year ?? ''}
					{album.year ? ' · ' : ''}{album.songCount}
					{album.songCount === 1 ? 'song' : 'songs'}
					{downloadedCount > 0 ? ` · ${downloadedCount} downloaded` : ''}
				</p>
			</div>
		</div>

		<div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 justify-between">
			<div class="flex items-center gap-2 sm:gap-3">
				<Button onclick={handlePlayAll} variant="default" class="rounded-full px-6 bg-accent">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="currentColor"><path d="M8 5v14l11-7z" /></svg
					>
					Play All
				</Button>
				<div>
					<Button
						onclick={handleDownloadAll}
						disabled={downloadingAll}
						variant="ghost"
						class="rounded-l-full! border-r-0"
					>
						<Download class="h-4 w-4" />
					</Button><Button
						onclick={(e) => handleAlbumContext(e)}
						variant="ghost"
						size="icon"
						class="rounded-r-full! border-l-0"
					>
						<MoreHorizontal class="h-4 w-4" />
					</Button>
				</div>
			</div>
			<div>
				<Button
					onclick={() => (showSettings = !showSettings)}
					variant="outline"
					size="icon"
					class="relative rounded-full"
				>
					<!-- Note the 'relative' class added above to contain the absolute icons -->
					{#if showSettings}
						<div
							transition:scale={{ duration: 150 }}
							class="absolute inset-0 flex items-center justify-center"
						>
							<X class="h-4 w-4" />
						</div>
					{:else}
						<div
							transition:scale={{ duration: 150 }}
							class="absolute inset-0 flex items-center justify-center"
						>
							<Settings class="h-4 w-4" />
						</div>
					{/if}
				</Button>
			</div>
		</div>

		{#if showSettings}
			<div
				transition:slide={{ duration: 200 }}
				class="bg-black/40 backdrop-blur-sm p-3 rounded-lg mb-3 overflow-hidden"
			>
				<h2 class="font-bold text-zinc-300">Album Page Settings</h2>
				<span class="text uppercase text-[0.6rem] font-bold text-zinc-600">
					Applies to all album pages
				</span>
				<p class="text-zinc-400">
					This thing isn't finished yet! It will allow you to customise what album pages look like
					specifically. It is separate from the settings page so that you can see the result of your
					changes immediately.
				</p>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>Choose</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item>Ghost</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}

		<div class="space-y-1">
			{#each discGroups as group (group.disc)}
				{#if discGroups.length > 1}
					<p
						class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider text-zinc-500"
					>
						<Disc class="h-3 w-3" />
						Disc {group.disc}
					</p>
				{/if}
				<Songs
					songs={group.songs}
					showControls={false}
					sortMode="track-asc"
					showStar
					showTrackNumber
					showDuration
					{currentTrackId}
					isPlaying={playing}
					{favStyle}
					onplay={(song) => handlePlaySong(song)}
					onsttoggle={(song) => toggleStar(song)}
				/>
			{/each}
		</div>
	{/if}
</div>

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}

{#if showLightbox}
	<div
		role="none presentation"
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
		onclick={closeLightbox}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeLightbox();
		}}
	>
		<div
			class="flex flex-col items-center gap-3"
			onclick={(e) => {
				e.stopPropagation();
				dismissHint();
			}}
			onwheel={dismissHint}
		>
			<div
				role="img"
				aria-label="Enlarged album cover"
				class="cursor-grab overflow-hidden shadow-2xl"
				style="transform: translate({offsetX}px, {offsetY}px) scale({lightboxScale}); {isDragging
					? 'cursor: grabbing;'
					: ''}"
				onclick={(e) => {
					e.stopPropagation();
					if (didDrag) return;
					toggleZoom(e);
				}}
				onwheel={(e) => {
					dismissHint();
					handleWheel(e);
				}}
				onmousedown={(e) => startDrag(e)}
				onmousemove={(e) => doDrag(e)}
				onmouseup={stopDrag}
				onmouseleave={stopDrag}
			>
				<img
					src={getCoverArtUrl(album!.coverArt, 2048)}
					alt={album!.name}
					class="block max-h-[90vh] max-w-[90vw] select-none rounded-none! object-contain"
					draggable="false"
				/>
			</div>
			{#if showHint}
				<p class="text-xs text-zinc-500 select-none">
					Click to zoom · Scroll to zoom · Drag to pan · Click outside to close
				</p>
			{/if}
		</div>
	</div>
{/if}
