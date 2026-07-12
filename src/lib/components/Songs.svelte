<script lang="ts">
	import SongRow from '$lib/components/Song.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import {
		ArrowUpAZ,
		ArrowDownAZ,
		ArrowUp01,
		ArrowDown01,
		Dices,
		Filter
	} from '@lucide/svelte';
	import { playNow, queueSongsEnd } from '$lib/stores/player.svelte';
	import type { Song as SongType } from '$lib/types';
	import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';

	type LyricsFilter = 'all' | 'with-lyrics' | 'without-lyrics';
	type SortMode =
		| 'title-asc'
		| 'title-desc'
		| 'artist-asc'
		| 'artist-desc'
		| 'album-asc'
		| 'album-desc'
		| 'duration-asc'
		| 'duration-desc'
		| 'track-asc'
		| 'track-desc'
		| 'random'
		| 'artist-albums-desc'
		| 'artist-albums-asc';
	type Density = 'compact' | 'normal' | 'spacious';

	let {
		songs = $bindable([]),
		artistAlbumCount = new Map<string, number>(),
		songsWithLyricsIds = new Set<string>(),
		density = $bindable('normal' as Density),
		sortMode = $bindable('title-asc' as SortMode),
		lyricsFilter = $bindable('all' as LyricsFilter),
		loading = false,
		showControls = true,
		showStar = true,
		showTrackNumber = false,
		showDuration = true,
		currentTrackId = '',
		isPlaying = false,
		favStyle = 'star',
		onplay,
		oncontext,
		onsttoggle,
		getExtraCtxItems,
		class: className = ''
	}: {
		songs?: SongType[];
		artistAlbumCount?: Map<string, number>;
		songsWithLyricsIds?: Set<string>;
		density?: Density;
		sortMode?: SortMode;
		lyricsFilter?: LyricsFilter;
		loading?: boolean;
		showControls?: boolean;
		showStar?: boolean;
		showTrackNumber?: boolean;
		showDuration?: boolean;
		currentTrackId?: string | null;
		isPlaying?: boolean;
		favStyle?: string;
		onplay?: (song: SongType) => void;
		oncontext?: (e: MouseEvent, song: SongType) => void;
		onsttoggle?: (song: SongType) => void;
		getExtraCtxItems?: (song: SongType) => ContextMenuItem[];
		class?: string;
	} = $props();

	const sortLabels: Record<string, Record<string, [string, typeof ArrowUpAZ]>> = {
		Alphabetical: {
			'title-asc': ['Title A-Z', ArrowUpAZ],
			'title-desc': ['Title Z-A', ArrowDownAZ],
			'artist-asc': ['Artist A-Z', ArrowUpAZ],
			'artist-desc': ['Artist Z-A', ArrowDownAZ],
			'album-asc': ['Album A-Z', ArrowUpAZ],
			'album-desc': ['Album Z-A', ArrowDownAZ]
		},
		Numerical: {
			'duration-asc': ['Duration (shortest)', ArrowUp01],
			'duration-desc': ['Duration (longest)', ArrowDown01],
			'track-asc': ['Track # ascending', ArrowUp01],
			'track-desc': ['Track # descending', ArrowDown01]
		},
		Other: {
			random: ['Random', Dices],
			'artist-albums-desc': ['Artist with most albums', ArrowDown01],
			'artist-albums-asc': ['Artist with least albums', ArrowUp01]
		}
	};

	const filterLabels: Record<LyricsFilter, string> = {
		all: 'All songs',
		'with-lyrics': 'With lyrics',
		'without-lyrics': 'Without lyrics'
	};

	let currentSort = $derived.by(() => {
		for (const modes of Object.values(sortLabels)) {
			const entry = Object.entries(modes).find(([key]) => key === sortMode);
			if (entry) return { label: entry[1][0] as string, Icon: entry[1][1] };
		}
		return { label: sortMode, Icon: undefined as typeof ArrowUpAZ | undefined };
	});

	let sortedSongs = $derived.by(() => {
		let arr = [...songs];
		if (lyricsFilter === 'with-lyrics') {
			arr = arr.filter((s) => songsWithLyricsIds.has(s.id));
		} else if (lyricsFilter === 'without-lyrics') {
			arr = arr.filter((s) => !songsWithLyricsIds.has(s.id));
		}
		switch (sortMode) {
			case 'title-asc':
				return arr.sort((a, b) => a.title.localeCompare(b.title));
			case 'title-desc':
				return arr.sort((a, b) => b.title.localeCompare(a.title));
			case 'artist-asc':
				return arr.sort((a, b) => a.artist.localeCompare(b.artist));
			case 'artist-desc':
				return arr.sort((a, b) => b.artist.localeCompare(a.artist));
			case 'album-asc':
				return arr.sort((a, b) => a.album.localeCompare(b.album));
			case 'album-desc':
				return arr.sort((a, b) => b.album.localeCompare(a.album));
			case 'duration-asc':
				return arr.sort((a, b) => a.duration - b.duration);
			case 'duration-desc':
				return arr.sort((a, b) => b.duration - a.duration);
			case 'track-asc':
				return arr.sort(
					(a, b) =>
						(a.discNumber || 1) * 1000 +
						(a.track || 999) -
						((b.discNumber || 1) * 1000 + (b.track || 999))
				);
			case 'track-desc':
				return arr.sort(
					(a, b) =>
						(b.discNumber || 1) * 1000 +
						(b.track || 0) -
						((a.discNumber || 1) * 1000 + (a.track || 0))
				);
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
			default:
				return arr;
		}
	});

	let coverSize = $derived(
		{ compact: 'sm' as const, normal: 'md' as const, spacious: 'lg' as const }[density]
	);

	const listPaddings: Record<string, string> = {
		compact: 'px-2 py-1.5',
		normal: 'px-3 py-2',
		spacious: 'px-4 py-3'
	};

	function defaultOnPlay(song: SongType) {
		const idx = sortedSongs.findIndex((s) => s.id === song.id);
		const rest = idx >= 0 ? sortedSongs.slice(idx + 1) : [];
		playNow(song);
		if (rest.length) queueSongsEnd(rest);
	}

	const effectiveOnPlay = onplay ?? defaultOnPlay;
</script>

<div class={className}>
	{#if showControls}
	<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-xl font-bold text-zinc-100">Songs</h1>
		<div class="flex items-center gap-2">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<div class="flex flex-col items-start gap-0.5">
						<span class="text-[0.7rem] font-bold uppercase text-zinc-500">Sort by</span>
						<Button variant="outline">
							{#if currentSort.Icon}
								{@const Icon = currentSort.Icon}
								<Icon class="h-4 w-4" />
							{/if}
							{currentSort.label}
						</Button>
					</div>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-60">
					<DropdownMenu.RadioGroup bind:value={sortMode}>
						{#each Object.entries(sortLabels) as [category, modes], index}
							<DropdownMenu.Label>{category}</DropdownMenu.Label>
							{#each Object.entries(modes) as [mode, [label, itemIcon]]}
								{@const Icon = itemIcon}
								<DropdownMenu.RadioItem onSelect={() => (sortMode = mode)} value={mode}>
									<Icon class="h-4 w-4" />
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

			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<div class="flex flex-col items-start gap-0.5">
						<span class="text-[0.7rem] font-bold uppercase text-zinc-500">Filter</span>
						<Button variant="outline">
							<Filter class="h-4 w-4" />
							{filterLabels[lyricsFilter]}
						</Button>
					</div>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.RadioGroup bind:value={lyricsFilter}>
						{#each Object.entries(filterLabels) as [key, label]}
							<DropdownMenu.RadioItem onSelect={() => (lyricsFilter = key)} value={key}>
								{label}
							</DropdownMenu.RadioItem>
						{/each}
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Root>

			<div class="flex flex-col items-start gap-0.5">
				<span class="text-[0.7rem] font-bold uppercase text-zinc-500">Density</span>
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
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else}
		<div class="space-y-1">
			{#each sortedSongs as song (song.id)}
				<SongRow
					{song}
					{coverSize}
					showAlbum={true}
					showStar={showStar}
					showTrackNumber={showTrackNumber}
					showDuration={showDuration}
					isCurrent={song.id === currentTrackId}
					{isPlaying}
					{favStyle}
					onplay={effectiveOnPlay}
					oncontext={oncontext}
					onsttoggle={onsttoggle}
					extraCtxItems={getExtraCtxItems?.(song) ?? []}
					class={listPaddings[density]}
				/>
			{/each}
		</div>
	{/if}
</div>
