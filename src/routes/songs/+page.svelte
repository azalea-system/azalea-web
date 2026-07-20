<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllSongs, getArtists, getSongsWithLyrics, toggleStar } from '$lib/api';
	import CantConnect from '$lib/components/CantConnect.svelte';
	import { titleEnding, getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { getCurrentTrackId, isPlaying } from '$lib/stores/player.svelte';
	import Songs from '$lib/components/Songs.svelte';
	import type { Song } from '$lib/types';

	let songs = $state<Song[]>([]);
	let loading = $state(true);

	let artistAlbumCount = $state<Map<string, number>>(new Map());

	let songsWithLyricsIds = $state<Set<string>>(new Set());

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let favStyle = $derived(getFavouriteSongStyle());

	onMount(async () => {
		try {
			songs = await getAllSongs(500);
			const idx = await getArtists();
			const map = new Map<string, number>();
			for (const g of idx) {
				for (const a of g.artist) {
					map.set(a.id, a.albumCount);
				}
			}
			artistAlbumCount = map;
			const lyricIds = await getSongsWithLyrics();
			songsWithLyricsIds = new Set(lyricIds);
		} catch (e) {
			console.error('Failed to fetch songs', e);
		} finally {
			loading = false;
		}
	});
</script>

<CantConnect />

<svelte:head>
	<title>Songs{titleEnding}</title>
</svelte:head>

<div class="p-6">
	<Songs
		{songs}
		{loading}
		{artistAlbumCount}
		{songsWithLyricsIds}
		{currentTrackId}
		isPlaying={playing}
		{favStyle}
		onsttoggle={toggleStar}
	/>
</div>
