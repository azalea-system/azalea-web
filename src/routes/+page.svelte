<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAlbumList, getRandomSongs, getBase, downloadOnServer, toggleStar } from '$lib/api';
	import CantConnect from '$lib/components/CantConnect.svelte';
	import {
		playNow,
		getCurrentTrackId,
		isPlaying,
		setCurrentTrack,
		setPlaying,
		setQueue
	} from '$lib/stores/player.svelte';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { queueSongsNext, queueSongsEnd } from '$lib/stores/player.svelte';
	import { isDownloading } from '$lib/stores/downloads.svelte';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { Play, ListPlus, Copy, Disc, Download, Music2 } from '@lucide/svelte';
	import * as ContextMenu from '$lib/components/ui/context-menu/index.js';
	import Albums from '$lib/components/Albums.svelte';
	import SongRow from '$lib/components/Song.svelte';
	import type { Album, Song } from '$lib/types';

	let albums = $state<Album[]>([]);
	let randomSongs = $state<Song[]>([]);
	let loading = $state(true);

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let favStyle = $derived(getFavouriteSongStyle());

	onMount(async () => {
		console.log('Page mounted, loading library data...');
		try {
			const [albumRes, songsRes] = await Promise.all([
				getAlbumList('newest', 30),
				getRandomSongs(10)
			]);
			console.log('Library data loaded successfully');
			albums = albumRes;
			randomSongs = songsRes;
		} catch (e) {
			console.error('Failed to fetch library data', e);
		} finally {
			loading = false;
		}

		try {
			console.log('Restoring player state from server...');
			const auth = (await import('$lib/stores/settings.svelte')).getServerAuth();
			const url = new URL(`${getBase()}/rest/getNowplaying`);
			if (auth?.username) {
				url.searchParams.set('u', auth.username);
				url.searchParams.set('p', auth.password);
			}
			const response = await fetch(url.toString());
			console.log('Response status:', response.status);
			const data = await response.json();
			console.log('Player state response:', data);
			if (data.nowplaying) {
				console.log('Found nowplaying data:', data.nowplaying);
				const { songId, title, artist, album, duration, startTime, albumId } = data.nowplaying;
				if (songId) {
					console.log('Setting current track:', songId);
					const coverArt = albumId ? `al-${albumId}` : '';
					const song: Song = {
						id: songId,
						title,
						artist,
						album,
						duration,
						track: 0,
						artistId: '',
						coverArt,
						bitRate: 0,
						path: '',
						album_id: albumId || ''
					};
					setCurrentTrack(song);
					setPlaying(true);
					setQueue([song]);
					console.log('Player state restored successfully');
				} else {
					console.log('No songId in nowplaying data');
				}
			} else {
				console.log('No nowplaying data found');
			}
		} catch (e) {
			console.error('Failed to restore player state', e);
		}
	});

	function handlePlaySong(song: Song) {
		console.log('Handle play song:', song.id, song.title);
		const album = albums.find((a) => a.id === song.album_id);
		if (album?.song) {
			console.log('Playing song with album context:', album.id);
			playNow(song, album.song);
		} else {
			console.log('Playing song without album context');
			playNow(song);
		}
	}
</script>

<CantConnect />

<svelte:head>
	<title>Home{titleEnding}</title>
</svelte:head>

<div class="p-6">
	<nav class="mb-6 flex flex-col gap-2 lg:hidden">
		<a
			href="/artists"
			class="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
		>
			Artists
		</a>
		<a
			href="/albums"
			class="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
		>
			Albums
		</a>
		<a
			href="/songs"
			class="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-center text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
		>
			Songs
		</a>
	</nav>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else}
		<section class="mb-10">
			<Albums {albums} title="New Releases" viewAll={true} />
		</section>

		<section>
			<h2 class="mb-4 text-lg font-semibold text-zinc-100">Random Songs</h2>
			<div class="space-y-1">
				{#each randomSongs as song (song.id)}
					<ContextMenu.Root>
						<ContextMenu.Trigger>
							<SongRow
								{song}
								showStar
								showDuration
								isCurrent={song.id === currentTrackId}
								isPlaying={playing}
								{favStyle}
								onplay={() => handlePlaySong(song)}
								onsttoggle={() => toggleStar(song)}
							/>
						</ContextMenu.Trigger>
						<ContextMenu.Content>
							<ContextMenu.Item
								onSelect={() => {
									const album = albums.find((a) => a.id === song.album_id);
									if (album?.song) {
										playNow(song, album.song);
									} else {
										playNow(song);
									}
								}}
							>
								<Play class="h-3.5 w-3.5 shrink-0" /> Play now
							</ContextMenu.Item>
							<ContextMenu.Item onSelect={() => queueSongsNext([song])}>
								<Play class="h-3.5 w-3.5 shrink-0" /> Play next
							</ContextMenu.Item>
							<ContextMenu.Item onSelect={() => queueSongsEnd([song])}>
								<ListPlus class="h-3.5 w-3.5 shrink-0" /> Add to queue
							</ContextMenu.Item>
							{#if !song.path}
								<ContextMenu.Item
									onSelect={() => downloadOnServer(song.id)}
									disabled={isDownloading(song.id)}
								>
									<Download class="h-3.5 w-3.5 shrink-0" />
									{isDownloading(song.id) ? 'Downloading...' : 'Download'}
								</ContextMenu.Item>
							{/if}
							<ContextMenu.Item onSelect={() => navigator.clipboard.writeText(song.title)}>
								<Copy class="h-3.5 w-3.5 shrink-0" /> Copy title
							</ContextMenu.Item>
							<ContextMenu.Item onSelect={() => navigator.clipboard.writeText(song.artist)}>
								<Copy class="h-3.5 w-3.5 shrink-0" /> Copy artist
							</ContextMenu.Item>
							<ContextMenu.Item onSelect={() => goto('/albums/' + song.album_id)}>
								<Disc class="h-3.5 w-3.5 shrink-0" /> Go to album
							</ContextMenu.Item>
							<ContextMenu.Item onSelect={() => goto('/artists/' + song.artistId)}>
								<Music2 class="h-3.5 w-3.5 shrink-0" /> Go to artist
							</ContextMenu.Item>
						</ContextMenu.Content>
					</ContextMenu.Root>
				{/each}
			</div>
		</section>
	{/if}
</div>
