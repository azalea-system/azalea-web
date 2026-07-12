<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { searchAll, getAlbum, toggleStar } from '$lib/api';
	import { playNow, queueSongsNow, queueSongsNext, queueSongsEnd, getCurrentTrackId, isPlaying } from '$lib/stores/player.svelte';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import Albums from '$lib/components/Albums.svelte';
	import Artists from '$lib/components/Artists.svelte';
	import { Play, ListPlus, ListMusic, Copy, User } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import SongList from '$lib/components/Songs.svelte';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import type { Song, Album, Artist } from '$lib/types';

	let query = $derived($page.url.searchParams.get('q') || '');

	let songs = $state<Song[]>([]);
	let albums = $state<Album[]>([]);
	let artists = $state<Artist[]>([]);
	let loading = $state(true);
	let activeTab = $state<'all' | 'songs' | 'albums' | 'artists'>('all');

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let favStyle = $derived(getFavouriteSongStyle());

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: { label: string; icon?: typeof Play; action: () => void; disabled?: boolean }[];
	} | null>(null);
	let ctxAlbum = $state<Album | null>(null);
	let ctxArtist = $state<Artist | null>(null);

	$effect(() => {
		if (query) {
			loading = true;
			activeTab = 'all';
			searchAll(query)
				.then((res) => {
					songs = res.song;
					albums = res.album;
					artists = res.artist;
					loading = false;
				})
				.catch(() => {
					loading = false;
				});
		} else {
			songs = [];
			albums = [];
			artists = [];
			loading = false;
		}
	});

	function handlePlaySong(song: Song) {
		playNow(song);
	}

	async function handleAlbumContext(e: MouseEvent, album: Album) {
		e.preventDefault();
		ctxAlbum = album;
		let albumSongs = album.song;
		if (!albumSongs && album.id) {
			try {
				const full = await getAlbum(album.id);
				albumSongs = full.song;
			} catch {
				
			}
		}
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{
					label: 'Play now',
					icon: Play,
					action: () => {
						if (albumSongs?.length) queueSongsNow(albumSongs);
					}
				},
				{
					label: 'Play next',
					icon: ListPlus,
					action: () => {
						if (albumSongs?.length) queueSongsNext(albumSongs);
					}
				},
				{
					label: 'Add to queue',
					icon: ListMusic,
					action: () => {
						if (albumSongs?.length) queueSongsEnd(albumSongs);
					}
				},
				{
					label: 'Copy title',
					icon: Copy,
					action: () => navigator.clipboard.writeText(album.name)
				},
				{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + album.artistId) }
			]
		};
	}

	function handleArtistContext(e: MouseEvent, artist: Artist) {
		e.preventDefault();
		ctxArtist = artist;
		ctxMenu = {
			x: e.clientX,
			y: e.clientY,
			items: [
				{
					label: 'Copy name',
					icon: Copy,
					action: () => navigator.clipboard.writeText(artist.name)
				},
				{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + artist.id) }
			]
		};
	}

	let allCount = $derived(songs.length + albums.length + artists.length);
</script>

<div class="lg:hidden">
	<div
		class="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950 px-4 pb-4 pt-4"
		style="padding-top: max(1rem, env(safe-area-inset-top, 0px))"
	>
		<h1 class="mb-3 text-lg font-bold text-zinc-100">Search</h1>
		<SearchBar variant="mobile" autofocus />
	</div>
</div>

<div class="hidden p-6 lg:block">
	<h1 class="mb-6 text-xl font-bold text-zinc-100">
		Results for "<span class="accent-text">{query}</span>"
	</h1>

	{#if !query}
		<p class="text-sm text-zinc-500">Enter a search term to find songs, albums, and artists.</p>
	{:else if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else if allCount === 0}
		<p class="text-sm text-zinc-500">No results found for "{query}".</p>
	{:else}
		<div class="mb-6 flex border-b border-zinc-800">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (activeTab = 'all')}
				class={activeTab === 'all' ? 'bg-muted' : ''}
			>
				All ({allCount})
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (activeTab = 'songs')}
				class={activeTab === 'songs' ? 'bg-muted' : ''}
			>
				Songs ({songs.length})
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (activeTab = 'albums')}
				class={activeTab === 'albums' ? 'bg-muted' : ''}
			>
				Albums ({albums.length})
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => (activeTab = 'artists')}
				class={activeTab === 'artists' ? 'bg-muted' : ''}
			>
				Artists ({artists.length})
			</Button>
		</div>

		{#if activeTab === 'all'}
			{#if songs.length}
				<h2 class="mb-3 text-sm font-semibold text-zinc-300">Songs</h2>
				<div class="mb-8 space-y-1">
					<SongList
						{songs}
						showStar
						showDuration
						{currentTrackId}
						isPlaying={playing}
						{favStyle}
						onplay={(song) => handlePlaySong(song)}
						onsttoggle={(song) => toggleStar(song)}
					/>
				</div>
			{/if}
			{#if albums.length}
				<h2 class="mb-3 text-sm font-semibold text-zinc-300">Albums</h2>
				<div class="mb-8">
					<Albums {albums} oncontextmenu={handleAlbumContext} />
				</div>
			{/if}
			{#if artists.length}
				<h2 class="mb-3 text-sm font-semibold text-zinc-300">Artists</h2>
				<div class="mb-8">
					<Artists {artists} oncontextmenu={handleArtistContext} />
				</div>
			{/if}
		{:else if activeTab === 'songs'}
			{#if songs.length > 0}
				<div class="space-y-1">
					<SongList
						{songs}
						showStar
						showDuration
						{currentTrackId}
						isPlaying={playing}
						{favStyle}
						onplay={(song) => handlePlaySong(song)}
						onsttoggle={(song) => toggleStar(song)}
					/>
				</div>
			{:else}
				<p class="text-sm text-zinc-500">No results.</p>
			{/if}
		{:else if activeTab === 'albums'}
			{#if albums.length > 0}
				<Albums {albums} oncontextmenu={handleAlbumContext} />
			{:else}
				<p class="text-sm text-zinc-500">No results.</p>
			{/if}
		{:else if activeTab === 'artists'}
			{#if artists.length > 0}
				<Artists {artists} oncontextmenu={handleArtistContext} />
			{:else}
				<p class="text-sm text-zinc-500">No results.</p>
			{/if}
		{/if}
	{/if}
</div>

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
