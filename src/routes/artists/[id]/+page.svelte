<script lang="ts">
	import { onMount } from 'svelte';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getArtist, getAlbum, getCoverArtUrl, getArtistMusicBrainzAlbums } from '$lib/api';
	import { queueSongsNow, queueSongsNext, queueSongsEnd } from '$lib/stores/player.svelte';
	import { Play, ListPlus, ListMusic, Copy, User } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import Albums from '$lib/components/Albums.svelte';
	import type { Artist, Album } from '$lib/types';

	let artist = $state<Artist | null>(null);
	let loading = $state(true);

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: typeof Play; action: () => void }[];
	} | null>(null);

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;
		try {
			artist = await getArtist(id);
		} catch (e) {
			console.error('Failed to fetch artist', e);
		} finally {
			loading = false;
		}
	});

	let fetchingMB = $state(false);
	let mbResult = $state<{ added: string[]; skipped: string[]; error?: string } | null>(null);

	async function handleShowAllAlbums() {
		if (!artist) return;
		fetchingMB = true;
		mbResult = null;
		try {
			const id = $page.params.id;
			mbResult = await getArtistMusicBrainzAlbums(id);
			if (mbResult.added.length > 0) {
				const refreshed = await getArtist(id);
				if (refreshed) artist = refreshed;
			}
		} catch (e) {
			mbResult = { added: [], skipped: [], error: String(e) };
		} finally {
			fetchingMB = false;
		}
	}

	function copy(t: string) {
		navigator.clipboard.writeText(t);
	}

	function handleArtistContext(e: MouseEvent) {
		e.preventDefault();
		if (!artist) return;
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [{ label: 'Copy name', icon: Copy, action: () => copy(artist!.name) }]
		};
	}

	async function handleAlbumContext(e: MouseEvent, album: Album) {
		e.preventDefault();
		let albumSongs = album.song;
		if (!albumSongs && album.id) {
			try {
				const full = await getAlbum(album.id);
				albumSongs = full.song;
			} catch {}
		}
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{
					label: 'Play now',
					icon: Play,
					action: () => {
						if (albumSongs && albumSongs.length > 0) {
							queueSongsNow(albumSongs);
						}
					}
				},
				{
					label: 'Play next',
					icon: ListPlus,
					action: () => {
						if (albumSongs && albumSongs.length > 0) {
							queueSongsNext(albumSongs);
						}
					}
				},
				{
					label: 'Add to queue',
					icon: ListMusic,
					action: () => {
						if (albumSongs && albumSongs.length > 0) {
							queueSongsEnd(albumSongs);
						}
					}
				},
				{ label: 'Copy title', icon: Copy, action: () => copy(album.name) },
				{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + album.artistId) }
			]
		};
	}

	let showLightbox = $state(false);
	let scale = $state(1);
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
		scale = 1;
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
		if (scale > 1) {
			scale = 1;
			offsetX = 0;
			offsetY = 0;
		} else {
			scale = 2;
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
		const newScale = Math.max(0.5, Math.min(10, scale * (1 + delta)));
		const ratio = newScale / scale;
		offsetX = mx - ratio * mx;
		offsetY = my - ratio * my;
		scale = newScale;
	}

	function startDrag(e: MouseEvent) {
		if (scale <= 1) return;
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

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}
</script>

<svelte:head>
	<title>{artist?.name ?? 'Artist'}{titleEnding}</title>
</svelte:head>

<div class="p-6">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else if artist}
		<div class="mb-8">
			<div class="mb-4 flex items-center gap-4">
				<div
					role="button"
					tabindex="0"
					onclick={openLightbox}
					oncontextmenu={(e) => handleArtistContext(e)}
					class="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full bg-zinc-700"
				>
					<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-10 w-10"
							viewBox="0 0 24 24"
							fill="currentColor"
							><path
								d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
							/></svg
						>
					</div>
					<img
						src={getCoverArtUrl(artist.coverArt, 128)}
						alt={artist.name}
						class="relative h-full w-full object-cover"
						onerror={hideImg}
					/>
				</div>
				<div class="min-w-0">
					<h1
						role="button"
						tabindex="0"
						oncontextmenu={(e) => handleArtistContext(e)}
						class="truncate text-2xl font-bold text-zinc-100"
					>
						{artist.name}
					</h1>
					<p class="text-sm text-zinc-400">
						{artist.albumCount}
						{artist.albumCount === 1 ? 'album' : 'albums'}
					</p>
				</div>
			</div>
		</div>
		<div class="mb-4 flex items-center gap-3">
			<Button onclick={handleShowAllAlbums} disabled={fetchingMB} variant="outline" size="sm">
				{fetchingMB ? 'Fetching...' : 'Show all albums (MusicBrainz)'}
			</Button>
			{#if mbResult}
				{#if mbResult.error}
					<span class="text-sm text-red-400">{mbResult.error}</span>
				{:else}
					<span class="text-sm text-zinc-400">
						{mbResult.added.length > 0
							? `Added ${mbResult.added.length} album${mbResult.added.length === 1 ? '' : 's'}`
							: 'No new albums found'}
						{mbResult.skipped.length > 0 ? `(${mbResult.skipped.length} already in library)` : ''}
					</span>
				{/if}
			{/if}
		</div>
		<Albums albums={artist.album ?? []} showSongCount={true} oncontextmenu={handleAlbumContext} />
	{/if}
</div>

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
				aria-label="Enlarged artist image"
				class="cursor-grab overflow-hidden shadow-2xl"
				style="transform: translate({offsetX}px, {offsetY}px) scale({scale}); {isDragging
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
					src={getCoverArtUrl(artist!.coverArt, 2048)}
					alt={artist!.name}
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

{#if ctxMenu}
	<ContextMenu
		x={ctxMenu.x}
		y={ctxMenu.y}
		items={ctxMenu.items.map((item) => ({
			label: item.label,
			action: () => {
				item.action();
				ctxMenu = null;
			}
		}))}
		onClose={() => (ctxMenu = null)}
	/>
{/if}
