<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAlbumList, getAlbum, getCoverArtUrl, getArtists } from '$lib/api';
	import { getCurrentTrackId, isPlaying } from '$lib/stores/player.svelte';
	import { Play, ListPlus, ListMusic, Copy, User } from '@lucide/svelte';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import Albums from '$lib/components/Albums.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import type { Album } from '$lib/types';

	let albums = $state<Album[]>([]);
	let loading = $state(true);

	let artistAlbumCount = $state<Map<string, number>>(new Map());

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: typeof Play; action: () => void }[];
	} | null>(null);

	function handleAlbumContext(e: MouseEvent, album: Album) {
		e.preventDefault();
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{ label: 'Go to album', icon: Play, action: () => goto('/albums/' + album.id) },
				{
					label: 'Copy title',
					icon: Copy,
					action: () => navigator.clipboard.writeText(album.name)
				},
				{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + album.artistId) }
			]
		};
	}

	onMount(async () => {
		try {
			albums = await getAlbumList('newest', 200);
			const idx = await getArtists();
			const map = new Map<string, number>();
			for (const g of idx) {
				for (const a of g.artist) {
					map.set(a.id, a.albumCount);
				}
			}
			artistAlbumCount = map;
		} catch (e) {
			console.error('Failed to fetch albums', e);
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Albums{titleEnding}</title>
</svelte:head>

<div class="p-6">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else}
		<Albums {albums} {artistAlbumCount} oncontextmenu={handleAlbumContext} />
	{/if}
</div>

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
