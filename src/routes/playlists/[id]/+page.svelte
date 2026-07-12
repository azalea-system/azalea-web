<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';
	import {
		getPlaylist,
		deletePlaylist,
		removeFromPlaylist,
		toggleStar
	} from '$lib/api';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { playNow, getCurrentTrackId, isPlaying } from '$lib/stores/player.svelte';
	import { getFavouriteSongStyle } from '$lib/stores/settings.svelte';
	import { Play, Trash2, ArrowLeft } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import Songs from '$lib/components/Songs.svelte';
	import type { Playlist, Song } from '$lib/types';
	import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';

	let playlist = $state<Playlist | null>(null);
	let loading = $state(true);

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());
	let favStyle = $derived(getFavouriteSongStyle());

	function getExtraCtxItems(song: Song): ContextMenuItem[] {
		return [{
			label: 'Remove from playlist',
			action: () => handleRemoveFromPlaylist(song)
		}];
	}

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;
		try {
			playlist = await getPlaylist(id);
		} catch (e) {
			console.error('Failed to fetch playlist', e);
		} finally {
			loading = false;
		}
	});

	function handlePlayAll() {
		if (playlist?.entry && playlist.entry.length > 0) {
			playNow(playlist.entry[0], playlist.entry);
		}
	}

	function handlePlaySong(song: Song) {
		if (playlist?.entry) {
			playNow(song, playlist.entry);
		} else {
			playNow(song);
		}
	}

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const h = Math.floor(m / 60);
		if (h > 0) return `${h}h ${m % 60}m`;
		return `${m} min`;
	}

	async function handleDeletePlaylist() {
		if (!playlist || !confirm('Delete this playlist?')) return;
		try {
			await deletePlaylist(playlist.id);
			window.history.back();
		} catch (e) {
			console.error('Failed to delete playlist', e);
		}
	}

	async function handleRemoveFromPlaylist(song: Song) {
		if (!playlist?.entry) return;
		const idx = playlist.entry.indexOf(song);
		if (idx === -1) return;
		try {
			await removeFromPlaylist(playlist.id, [idx]);
			playlist.entry.splice(idx, 1);
			playlist.songCount = playlist.entry.length;
			playlist = playlist;
		} catch (e) {
			console.error('Failed to remove from playlist', e);
		}
	}

</script>

<svelte:head>
	<title>{playlist?.name ?? 'Playlist'}{titleEnding}</title>
</svelte:head>

<div class="p-6 max-lg:px-1">
	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600"></div>
		</div>
	{:else if playlist}
		<div class="mb-8">
			<a
				href="/playlists"
				class="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
			>
				<ArrowLeft class="h-4 w-4" />
				Back to playlists
			</a>
			<div class="flex items-start justify-between">
				<div>
					<p class="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">Playlist</p>
					<h1 class="mb-1 truncate text-3xl font-bold text-zinc-100">{playlist.name}</h1>
					{#if playlist.comment}
						<p class="mb-1 truncate text-sm text-zinc-400">{playlist.comment}</p>
					{/if}
					<p class="text-sm text-zinc-500">
						{playlist.songCount} {playlist.songCount === 1 ? 'song' : 'songs'}
						· {formatDuration(playlist.duration)}
					</p>
				</div>
				<Button onclick={handleDeletePlaylist} variant="outline" class="rounded-full">
					<Trash2 class="mr-1 h-4 w-4" />
					Delete
				</Button>
			</div>
		</div>

		<div class="mb-6">
			<Button onclick={handlePlayAll} variant="default" class="rounded-full px-6">
				<Play class="mr-1 h-4 w-4" />
				Play All
			</Button>
		</div>

		{#if playlist.entry && playlist.entry.length > 0}
			<Songs
				songs={playlist.entry}
				showStar
				showTrackNumber
				showDuration
				{currentTrackId}
				isPlaying={playing}
				{favStyle}
				onplay={(song) => handlePlaySong(song)}
				{getExtraCtxItems}
				onsttoggle={(song) => toggleStar(song)}
			/>
		{:else}
			<p class="py-10 text-center text-sm text-zinc-500">This playlist is empty</p>
		{/if}
	{/if}
</div>
