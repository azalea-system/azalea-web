<script lang="ts">
	import { History } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { removeSearchHistory, getSearchHistory } from '$lib/searchHistory';
	import SearchResultsList from '$lib/components/SearchResultsList.svelte';
	import type { Song, Album, Artist } from '$lib/types';

	let {
		variant = 'desktop',
		showPopup = $bindable(true),
		showHistory = false,
		results = null,
		loading = false,
		activeTab = $bindable('all'),
		query = '',
		focused = $bindable(false),
		history = [],
		onclose,
		onselecthistory,
		onremovehistory,
		onplay,
		ongoalbum,
		ongoartist
	}: {
		variant?: 'desktop' | 'mobile';
		showPopup?: boolean;
		showHistory?: boolean;
		results: { artist: Artist[]; album: Album[]; song: Song[] } | null;
		loading?: boolean;
		activeTab?: 'all' | 'songs' | 'albums' | 'artists';
		query?: string;
		focused?: boolean;
		history?: string[];
		onclose: () => void;
		onselecthistory: (item: string) => void;
		onremovehistory: (item: string) => void;
		onplay: (song: Song) => void;
		ongoalbum: (id: string) => void;
		ongoartist: (id: string) => void;
	} = $props();

	const isMobile = $derived(variant === 'mobile');
	const showResultsPopup = $derived(!isMobile && showPopup && !!query.trim() && results !== null);
	const showInlineResults = $derived(isMobile && !!query.trim() && results !== null);

	function handleRemove(item: string) {
		removeSearchHistory(item);
		if (getSearchHistory().length === 0) onremovehistory(item);
		else onremovehistory(item);
	}
</script>

{#if showHistory && history.length > 0}
	<div
		class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
	>
		<div class="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
			<span class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500"
				>Recent searches</span
			>
		</div>
		<div class="max-h-60 overflow-y-auto">
			{#each history as item (item)}
				<div class="flex items-center border-b border-zinc-800/50 last:border-b-0">
					<Button
						variant="ghost"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => onselecthistory(item)}
						class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-zinc-800/50 justify-start rounded-none w-full"
					>
						<History class="h-4 w-4 shrink-0 text-zinc-500" />
						<span class="truncate">{item}</span>
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onmousedown={(e) => e.preventDefault()}
						onclick={() => handleRemove(item)}
						aria-label="Remove from history"
						class="text-zinc-500 hover:text-zinc-300 rounded-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="currentColor"
							><path
								d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
							/></svg
						>
					</Button>
				</div>
			{/each}
		</div>
	</div>
{/if}

{#if showResultsPopup}
	<div
		class="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
	>
		<SearchResultsList
			{results}
			bind:query
			bind:focused
			bind:activeTab
			{loading}
			onPlaySong={onplay}
			onGoAlbum={ongoalbum}
			onGoArtist={ongoartist}
		/>
	</div>
{/if}

{#if showInlineResults}
	<div class="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
		<SearchResultsList
			{results}
			bind:query
			bind:activeTab
			{loading}
			onPlaySong={onplay}
			onGoAlbum={ongoalbum}
			onGoArtist={ongoartist}
		/>
	</div>
{/if}
