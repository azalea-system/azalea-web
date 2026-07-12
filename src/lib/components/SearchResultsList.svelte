<script lang="ts">
	import { getCoverArtUrl } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import SongRow from '$lib/components/Song.svelte';
	import type { Album, Artist, Song } from '$lib/types';

	let {
		results,
		activeTab = $bindable('all'),
		query = $bindable(''),
		focused = $bindable(true),
		loading = false,
		onPlaySong,
		onGoAlbum,
		onGoArtist
	}: {
		results: { artist: Artist[]; album: Album[]; song: Song[] } | null;
		query?: string;
		focused?: boolean;
		activeTab?: 'all' | 'songs' | 'albums' | 'artists';
		loading?: boolean;
		onPlaySong: (song: Song) => void;
		onGoAlbum: (id: string) => void;
		onGoArtist: (id: string) => void;
	} = $props();

	function focus(e) {
		e.preventDefault();
		focused = true;
	}

	function clearSearch() {
		query = '';
		results = null;
		activeTab = 'all';
		focused = false;
	}

	let allCount = $derived(
		(results?.song.length ?? 0) + (results?.album.length ?? 0) + (results?.artist.length ?? 0)
	);
</script>

{#snippet result(image, title, subtitle, onclick, link)}
	<Button
		variant="ghost"
		{onclick}
		href={link}
		class="flex w-full items-center gap-3 text-left text-sm rounded-none h-10 px-0"
	>
		<img
			src={image}
			alt=""
			class="h-full rounded-none! aspect-square shrink-0 object-cover bg-zinc-800"
			onerror={(e) => {
				(e.target as HTMLImageElement).style.display = 'none';
			}}
		/>
		<div class="min-w-0 flex-1">
			<div class="truncate text-zinc-100">{title}</div>
			{#if subtitle}
				<div class="truncate text-xs text-zinc-500">{subtitle}</div>
			{/if}
		</div>
	</Button>
{/snippet}

{#snippet resultsList(results)}
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="flex items-start w-full justify-start p-0">
			<div class="flex flex-col items-start p-1">
				<Tabs.Trigger value="all">
					All ({allCount})
				</Tabs.Trigger>
				<Tabs.Trigger value="songs">
					Songs ({results.song.length})
				</Tabs.Trigger>
				<Tabs.Trigger value="albums">
					Albums ({results.album.length})
				</Tabs.Trigger>
				<Tabs.Trigger value="artists">
					Artists ({results.artist.length})
				</Tabs.Trigger>
			</div>
			<div class="flex-1 overflow-y-auto border-l border-zinc-800 max-h-[calc(100vh-10rem)]">
				<Tabs.Content value="all">
					{#if results.song.length}
						<div
							class="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
						>
							Songs
						</div>
						{#each results.song as song (song.id)}
							<SongRow
								{song}
								coverSize="sm"
								showDuration={false}
								showStar={false}
								onplay={() => onPlaySong(song)}
								class="px-3 py-2"
							/>
						{/each}
					{/if}
					{#if results.album.length}
						<div
							class="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
						>
							Albums
						</div>
						{#each results.album as album (album.id)}
							{@render result(
								getCoverArtUrl(album.coverArt, 64),
								album.name,
								album.artist,
								() => onGoAlbum(album.id),
								null
							)}
						{/each}
					{/if}
					{#if results.artist.length}
						<div
							class="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
						>
							Artists
						</div>
						{#each results.artist as artist (artist.id)}
							{@render result(
								getCoverArtUrl(artist.coverArt, 64),
								artist.name,
								'',
								() => {
									onGoArtist(artist.id);
									clearSearch();
								},
								null
							)}
						{/each}
					{/if}
				</Tabs.Content>
				<Tabs.Content value="songs">
					{#each results.song as song (song.id)}
						<SongRow
							{song}
							coverSize="sm"
							showDuration={false}
							showStar={false}
							onplay={() => onPlaySong(song)}
							class="px-3 py-2"
						/>
					{/each}
				</Tabs.Content>
				<Tabs.Content value="albums">
					{#each results.album as album (album.id)}
						{@render result(
							getCoverArtUrl(album.coverArt, 64),
							album.name,
							album.artist,
							() => onGoAlbum(album.id),
							null
						)}
					{/each}
				</Tabs.Content>
				<Tabs.Content value="artists">
					{#each results.artist as artist (artist.id)}
						{@render result(
							getCoverArtUrl(artist.coverArt, 64),
							artist.name,
							'',
							() => onGoArtist(artist.id),
							null
						)}
					{/each}
				</Tabs.Content>
			</div>
		</Tabs.List>
	</Tabs.Root>
{/snippet}

<div onmousedown={focus} onmouseup={focus} onclick={focus}>
	{#if loading}
		<div class="px-4 py-8 text-center text-sm text-zinc-500">Searching...</div>
	{:else if !results || allCount === 0}
		<div class="px-4 py-8 text-center text-sm text-zinc-500">No results found</div>
	{:else}
		{@render resultsList(results)}
	{/if}
</div>
