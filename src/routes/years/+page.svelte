<script lang="ts">
	import { onMount } from 'svelte';
	import { getAlbumList, getArtists, getAllSongs, getCoverArtUrl } from '$lib/api';
	import CantConnect from '$lib/components/CantConnect.svelte';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { getCurrentTrackId, isPlaying, playNow, queueSongsEnd } from '$lib/stores/player.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Album, Artist, Song } from '$lib/types';

	type ViewMode = 'albums' | 'songs' | 'artists';
	let viewMode = $state<ViewMode>('albums');
	let loading = $state(true);

	let allAlbums: Album[] = [];
	let allSongs: Song[] = [];
	let allArtists: Artist[] = [];

	let currentTrackId = $derived(getCurrentTrackId());
	let playing = $derived(isPlaying());

	const viewLabels: Record<ViewMode, string> = {
		albums: 'Albums',
		songs: 'Songs',
		artists: 'Artists / Bands'
	};

	let yearGroups = $derived.by(() => {
		let items: { year: string; data: (Album | Song | Artist)[] }[] = [];

		if (viewMode === 'albums') {
			const grouped = new Map<string, Album[]>();
			for (const a of allAlbums) {
				if (!a.year) continue;
				if (!grouped.has(a.year)) grouped.set(a.year, []);
				grouped.get(a.year)!.push(a);
			}
			for (const [year, albums] of grouped) {
				items.push({ year, data: albums });
			}
		} else if (viewMode === 'songs') {
			const grouped = new Map<string, Song[]>();
			for (const s of allSongs) {
				if (!s.year) continue;
				if (!grouped.has(s.year)) grouped.set(s.year, []);
				grouped.get(s.year)!.push(s);
			}
			for (const [year, songs] of grouped) {
				items.push({ year, data: songs });
			}
		} else {
			const grouped = new Map<string, Artist[]>();
			for (const a of allArtists) {
				if (!a.inceptionYear) continue;
				if (!grouped.has(a.inceptionYear)) grouped.set(a.inceptionYear, []);
				grouped.get(a.inceptionYear)!.push(a);
			}
			for (const [year, artists] of grouped) {
				items.push({ year, data: artists });
			}
		}

		return items.sort((a, b) => b.year.localeCompare(a.year));
	});

	function playSong(song: Song) {
		const idx = allSongs.findIndex((s) => s.id === song.id);
		const rest = idx >= 0 ? allSongs.slice(idx + 1) : [];
		playNow(song);
		if (rest.length) queueSongsEnd(rest);
	}

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}

	function fmtDuration(ms: number): string {
		if (!ms || isNaN(ms)) return '0:00';
		const seconds = ms / 1000;
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	onMount(async () => {
		try {
			const [albumsRes, songsRes, artistsRes] = await Promise.all([
				getAlbumList('newest', 500),
				getAllSongs(500),
				getArtists()
			]);
			allAlbums = albumsRes;
			allSongs = songsRes;
			allArtists = artistsRes.flatMap((g) => g.artist);
		} catch (e) {
			console.error('Failed to fetch data', e);
		} finally {
			loading = false;
		}
	});
</script>

<CantConnect />

<svelte:head>
	<title>Years{titleEnding}</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-zinc-100">Years</h1>
		<div class="flex items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<div class="flex flex-col items-start gap-0.5">
						<span class="text-[0.7rem] font-bold uppercase text-zinc-500">View</span>
						<Button variant="outline">{viewLabels[viewMode]}</Button>
					</div>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.RadioGroup bind:value={viewMode}>
						{#each Object.entries(viewLabels) as [key, label]}
							<DropdownMenu.RadioItem onSelect={() => (viewMode = key as ViewMode)} value={key}>
								{label}
							</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else if yearGroups.length === 0}
		<div class="flex items-center justify-center py-20 text-zinc-500">
			No {viewLabels[viewMode].toLowerCase()} with year metadata found.
		</div>
	{:else}
		{#each yearGroups as group (group.year)}
			<div class="mb-3">
				<h2 class="mb-1 text-3xl text-white" style="font-weight: 900;">{group.year}</h2>

				{#if viewMode === 'albums'}
					<div
						class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each group.data as album (album.id)}
							<a
								href="/albums/{album.id}"
								class="group block rounded-lg p-3 transition-colors hover:bg-zinc-800"
							>
								<div class="relative mb-2 aspect-square overflow-hidden rounded-md bg-zinc-700">
									<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
										<svg class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"
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
								</div>
								<p class="truncate text-sm font-medium text-zinc-100">{album.name}</p>
								<p class="truncate text-xs text-zinc-400">{album.artist}</p>
							</a>
						{/each}
					</div>
				{:else if viewMode === 'songs'}
					<div class="space-y-1">
						{#each group.data as song (song.id)}
							<button
								onclick={() => playSong(song as Song)}
								oncontextmenu={(e) => e.preventDefault()}
								class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-800/50"
							>
								<div class="h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-700">
									<img
										src={getCoverArtUrl((song as Song).coverArt, 64)}
										alt=""
										class="h-full w-full object-cover"
										onerror={hideImg}
									/>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium text-zinc-100">{(song as Song).title}</p>
									<div class="flex items-center gap-1 truncate text-xs text-zinc-400">
										<span>{(song as Song).artist}</span>
										{#if (song as Song).album}
											<span class="text-zinc-600"> · </span>
											<span class="truncate">{(song as Song).album}</span>
										{/if}
									</div>
								</div>
								<span class="shrink-0 text-xs tabular-nums text-zinc-500"
									>{fmtDuration((song as Song).duration)}</span
								>
							</button>
						{/each}
					</div>
				{:else}
					<div
						class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
					>
						{#each group.data as artist (artist.id)}
							<a
								href="/artists/{artist.id}"
								class="group rounded-lg bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-800"
							>
								<div class="relative mb-2 aspect-square overflow-hidden rounded-full bg-zinc-700">
									<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
										<svg class="h-8 w-8" viewBox="0 0 24 24" fill="currentColor"
											><path
												d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
											/></svg
										>
									</div>
									<img
										src={getCoverArtUrl(artist.coverArt, 256)}
										alt={artist.name}
										class="relative h-full w-full object-cover"
										onerror={hideImg}
									/>
								</div>
								<p class="truncate text-sm font-medium text-zinc-100">{artist.name}</p>
								<p class="text-xs text-zinc-500">
									{artist.albumCount}
									{artist.albumCount === 1 ? 'album' : 'albums'}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>
