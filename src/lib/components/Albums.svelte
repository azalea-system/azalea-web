<script lang="ts">
	import { goto } from '$app/navigation';
	import { getCoverArtUrl } from '$lib/api';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import {
		LayoutGrid,
		LayoutList,
		ClockArrowDown,
		ClockArrowUp,
		ArrowUpAZ,
		ArrowDownAZ,
		ArrowUp01,
		ArrowDown01,
		Dices
	} from '@lucide/svelte';
	import type { Album } from '$lib/types';

	type Props = {
		albums?: Album[];
		viewMode?: 'grid' | 'list';
		density?: 'compact' | 'normal' | 'spacious';
		sortMode?;
		artistAlbumCount?: Map<string, number>;
		showSongCount?: boolean;
		oncontextmenu?: (e: MouseEvent, album: Album) => void;
	};

	let {
		albums = $bindable([]),
		viewMode = $bindable('grid'),
		density = $bindable('normal'),
		sortMode = $bindable('date-desc'),
		artistAlbumCount = new Map<string, number>(),
		showSongCount = false,
		oncontextmenu
	}: Props = $props();

	let sortOpen = $state(false);

	let sortedAlbums = $derived.by(() => {
		if (!sortMode) return albums;
		const arr = [...albums];
		switch (sortMode) {
			case 'date-desc':
				return arr.sort((a, b) => ((b.year || '0') > (a.year || '0') ? 1 : -1));
			case 'date-asc':
				return arr.sort((a, b) => ((a.year || '0') > (b.year || '0') ? 1 : -1));
			case 'alpha-asc':
				return arr.sort((a, b) => a.name.localeCompare(b.name));
			case 'alpha-desc':
				return arr.sort((a, b) => b.name.localeCompare(a.name));
			case 'artist-asc':
				return arr.sort((a, b) => a.artist.localeCompare(b.artist));
			case 'artist-desc':
				return arr.sort((a, b) => b.artist.localeCompare(a.artist));
			case 'random':
				return arr.sort(() => Math.random() - 0.5);
			case 'artist-albums-desc':
				return arr.sort(
					(a, b) =>
						(artistAlbumCount.get(b.artistId) || 0) - (artistAlbumCount.get(a.artistId) || 0)
				);
			case 'artist-albums-asc':
				return arr.sort(
					(a, b) =>
						(artistAlbumCount.get(a.artistId) || 0) - (artistAlbumCount.get(b.artistId) || 0)
				);
			case 'songs-desc':
				return arr.sort((a, b) => (b.songCount || 0) - (a.songCount || 0));
			case 'songs-asc':
				return arr.sort((a, b) => (a.songCount || 0) - (b.songCount || 0));
			default:
				return arr;
		}
	});

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}

	const gridCols: Record<string, string> = {
		compact: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7',
		normal: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
		spacious: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
	};

	const gridPaddings: Record<string, string> = {
		compact: 'p-2',
		normal: 'p-3',
		spacious: 'p-4'
	};

	const listPaddings: Record<string, string> = {
		compact: 'px-3 py-0.5',
		normal: 'px-4 py-1',
		spacious: 'px-5 py-4'
	};

	const listTextSizes: Record<string, { title: string; meta: string }> = {
		compact: { title: 'text-xs', meta: 'text-[10px]' },
		normal: { title: 'text-sm', meta: 'text-xs' },
		spacious: { title: 'text-base', meta: 'text-sm' }
	};

	const imgSizes: Record<string, string> = {
		compact: 'h-8 w-8',
		normal: 'h-10 w-10',
		spacious: 'h-14 w-14'
	};

	const sortLabels = {
		Chronological: {
			'date-desc': ['Release date (newest)', ClockArrowDown],
			'date-asc': ['Release date (oldest)', ClockArrowUp]
		},
		Alphabetical: {
			'alpha-asc': ['Name A-Z', ArrowUpAZ],
			'alpha-desc': ['Name Z-A', ArrowDownAZ],
			'artist-asc': ['Artist A-Z', ArrowUpAZ],
			'artist-desc': ['Artist Z-A', ArrowDownAZ]
		},
		Quantitative: {
			'artist-albums-desc': ['Artist with most albums', ArrowDown01],
			'artist-albums-asc': ['Artist with least albums', ArrowUp01],
			'songs-desc': ['Most songs', ArrowDown01],
			'songs-asc': ['Least songs', ArrowUp01]
		},
		Other: {
			random: ['Random', Dices]
		}
	};
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-xl font-bold text-zinc-100">Albums</h1>
	<div class="flex items-center gap-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<div class="flex flex-col items-start gap-0.5">
					<span class="text-[0.7rem] text-zinc-500 font-bold">SORT BY</span>
					<Button variant="outline">
						{@const Icon =
							sortLabels[
								Object.keys(sortLabels).find((category) =>
									Object.keys(sortLabels[category]).includes(sortMode)
								)
							][sortMode][1]}
						<Icon />
						{sortLabels[
							Object.keys(sortLabels).find((category) =>
								Object.keys(sortLabels[category]).includes(sortMode)
							)
						][sortMode][0]}
					</Button>
				</div>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-60">
				<DropdownMenu.RadioGroup bind:value={sortMode}>
					{#each Object.entries(sortLabels) as [category, modes], index (modes)}
						<DropdownMenu.Label>{category}</DropdownMenu.Label>
						{#each Object.entries(modes) as [mode, [label, itemIcon]] (mode)}
							{@const Icon = itemIcon}
							<DropdownMenu.RadioItem onSelect={() => (sortMode = mode)} value={mode}>
								<Icon />
								{label}
							</DropdownMenu.RadioItem>
						{/each}
						{#if index < Object.entries(sortLabels).length - 1}
							<DropdownMenu.Separator />
						{/if}
					{/each}
				</DropdownMenu.RadioGroup>
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<div class="flex flex-col items-start gap-0.5">
			<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">View Mode</span>
			<ToggleGroup.Root type="single" bind:value={viewMode} variant="outlineGroup">
				<ToggleGroup.Item value="grid"><LayoutGrid class="h-4 w-4" />Grid</ToggleGroup.Item>
				<ToggleGroup.Item value="list"><LayoutList class="h-4 w-4" />List</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>

		<div class="flex flex-col items-start gap-0.5">
			<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">Density</span>
			<ToggleGroup.Root
				type="single"
				bind:value={density}
				variant="outlineGroup"
				class="*:rounded-none!"
			>
				<ToggleGroup.Item value="compact" aria-label="Compact">Compact</ToggleGroup.Item>
				<ToggleGroup.Item value="normal" aria-label="Normal">Normal</ToggleGroup.Item>
				<ToggleGroup.Item value="spacious" aria-label="Spacious">Spacious</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
	</div>
</div>

{#if viewMode === 'grid'}
	<div class="grid {gridCols[density]}">
		{#each sortedAlbums as album (album.id)}
			<a
				href="/albums/{album.id}"
				oncontextmenu={(e) => oncontextmenu?.(e, album)}
				class="group block rounded-lg transition-colors hover:bg-zinc-800 {gridPaddings[density]}"
			>
				<div class="relative mb-2 aspect-square overflow-hidden rounded-md bg-zinc-700">
					<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-8 w-8"
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
				</div>
				<p class="truncate text-sm font-medium text-zinc-100">{album.name}</p>

				<span
					role="button"
					tabindex="0"
					onclick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						goto('/artists/' + album.artistId);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.stopPropagation();
							goto('/artists/' + album.artistId);
						}
					}}
					class="block truncate text-xs {showSongCount
						? 'text-zinc-500'
						: 'text-zinc-400 accent-hover-text'}"
				>
					{#if showSongCount}
						{album.songCount} {album.songCount === 1 ? 'song' : 'songs'}
					{:else}
						{album.artist}
					{/if}
				</span>
			</a>
		{/each}
	</div>
{:else}
	<div class="space-y-1">
		{#each sortedAlbums as album (album.id)}
			<a
				href="/albums/{album.id}"
				oncontextmenu={(e) => oncontextmenu?.(e, album)}
				class="flex cursor-pointer items-center gap-3 rounded-lg transition-colors hover:bg-zinc-800/50 {listPaddings[
					density
				]}"
			>
				<div class="shrink-0 overflow-hidden rounded bg-zinc-700 {imgSizes[density]}">
					<img
						src={getCoverArtUrl(album.coverArt, 128)}
						alt=""
						class="h-full w-full object-cover"
						onerror={hideImg}
					/>
				</div>
				<div class="min-w-0 flex-1">
					<p class="truncate {listTextSizes[density].title} font-medium text-zinc-100">
						{album.name}
					</p>

					<span
						role="button"
						tabindex="0"
						onclick={(e) => {
							e.stopPropagation();
							e.preventDefault();
							goto('/artists/' + album.artistId);
						}}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.stopPropagation();
								goto('/artists/' + album.artistId);
							}
						}}
						class="block truncate {listTextSizes[density].meta} text-zinc-400 accent-hover-text"
						>{album.artist}</span
					>
				</div>
				{#if showSongCount}
					<span class="shrink-0 {listTextSizes[density].meta} text-zinc-500"
						>{album.songCount} {album.songCount === 1 ? 'song' : 'songs'}</span
					>
				{/if}
			</a>
		{/each}
	</div>
{/if}
