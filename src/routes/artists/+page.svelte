<script lang="ts">
	import { onMount } from 'svelte';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getArtists, getCoverArtUrl } from '$lib/api';
	import CantConnect from '$lib/components/CantConnect.svelte';
	import Artists from '$lib/components/Artists.svelte';
	import type { ArtistsIndex, Artist } from '$lib/types';

	let indexes = $state<ArtistsIndex[]>([]);
	let loading = $state(true);

	type SortMode = 'alpha-asc' | 'alpha-desc' | 'random' | 'album-desc' | 'album-asc';
	let sortMode = $state<SortMode>('alpha-asc');

	let sortOpen = $state(false);

	function hideImg(event: Event) {
		const img = event.target as HTMLImageElement;
		if (img) img.style.display = 'none';
	}

	let sortedIndexes = $derived.by(() => {
		console.log('sorting these artist indexes:', indexes, 'with sortMode:', sortMode);
		if (sortMode === 'random') {
			const all = indexes.flatMap((g) => g.artist);
			all.sort(() => Math.random() - 0.5);
			return [{ name: 'Random', artist: all }];
		}
		if (sortMode === 'album-desc' || sortMode === 'album-asc') {
			const all = indexes.flatMap((g) => g.artist);
			all.sort((a, b) =>
				sortMode === 'album-desc' ? b.albumCount - a.albumCount : a.albumCount - b.albumCount
			);
			const label = sortMode === 'album-desc' ? 'Most albums' : 'Least albums';
			return [{ name: label, artist: all }];
		}
		let groups = indexes.map((g) => ({
			...g,
			artist: [...g.artist].sort((a, b) =>
				sortMode === 'alpha-desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
			)
		}));
		if (sortMode === 'alpha-desc') return [...groups].reverse();
		console.log('sorted artists indexes:', groups);
		return groups;
	});

	const sortLabels: Record<SortMode, string> = {
		'alpha-asc': 'Name A-Z',
		'alpha-desc': 'Name Z-A',
		random: 'Random',
		'album-desc': 'Most albums',
		'album-asc': 'Least albums'
	};

	onMount(async () => {
		try {
			indexes = await getArtists();
		} catch (e) {
			console.error('Failed to fetch artists', e);
		} finally {
			loading = false;
		}
	});
</script>

<CantConnect />

<svelte:head>
	<title>Artists{titleEnding}</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold text-zinc-100">Artists</h1>

		<div class="relative">
			<Button variant="outline" size="sm" onclick={() => (sortOpen = !sortOpen)} class="gap-1.5">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="currentColor"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" /></svg
				>
				{sortLabels[sortMode]}
			</Button>
			{#if sortOpen}
				<div
					class="fixed inset-0 z-40"
					onclick={() => (sortOpen = false)}
					onkeydown={() => (sortOpen = false)}
					role="presentation"
				/>
				<div
					class="bg-popover text-popover-foreground border border-border absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-md p-1 shadow-md ring-1 ring-foreground/10"
				>
					{#each Object.entries(sortLabels) as [key, label] (key)}
						<button
							onclick={() => {
								sortMode = key as SortMode;
								sortOpen = false;
							}}
							class="focus:bg-accent focus:text-accent-foreground gap-2 rounded-sm px-2 py-1.5 text-xs flex w-full items-center outline-hidden {sortMode ===
							key
								? 'bg-accent text-accent-foreground'
								: ''}"
						>
							{label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 accent-border-t"></div>
		</div>
	{:else}
		{#each sortedIndexes as group (group.name)}
			<div class="mb-6">
				<h2 class="mb-3 text-lg font-semibold text-zinc-300">{group.name}</h2>
				<div
					class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
				>
					{#each group.artist as artist (artist.id)}
						<a
							href="/artists/{artist.id}"
							class="group rounded-lg bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-800"
						>
							<div class="relative mb-2 aspect-square overflow-hidden rounded-full bg-zinc-700">
								<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-8 w-8"
										viewBox="0 0 24 24"
										fill="currentColor"
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
			</div>
		{/each}
	{/if}
</div>
