<script lang="ts">
	import { goto } from '$app/navigation';
	import { searchAll } from '$lib/api';
	import { playNow } from '$lib/stores/player.svelte';
	import { addSearchHistory, getSearchHistory } from '$lib/searchHistory';
	import SearchPopup from '$lib/components/SearchPopup.svelte';
	import { getAccentColor } from '$lib/stores/settings.svelte';
	import { Search } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Song, Album, Artist } from '$lib/types';

	let {
		variant = 'desktop',
		autofocus = false,
		initialQuery = ''
	}: {
		variant?: 'desktop' | 'mobile';
		autofocus?: boolean;
		initialQuery?: string;
	} = $props();

	let query = $state(initialQuery);
	let results = $state<{ artist: Artist[]; album: Album[]; song: Song[] } | null>(null);
	let showPopup = $state(false);
	let showHistory = $state(false);
	let activeTab = $state<'all' | 'songs' | 'albums' | 'artists'>('all');
	let loading = $state(false);
	let history = $state<string[]>([]);
	let debounceTimer: ReturnType<typeof setTimeout>;

	let inputEl: HTMLInputElement;
	let focused = $state(false);

	const isMobile = $derived(variant === 'mobile');

	function refreshHistory() {
		history = getSearchHistory();
	}

	function runSearch(q: string) {
		const trimmed = q.trim();
		if (!trimmed) {
			results = null;
			showPopup = false;
			return;
		}
		loading = true;
		showHistory = false;
		searchAll(trimmed)
			.then((res) => {
				results = res;
				activeTab = 'all';
				if (!isMobile) showPopup = true;
			})
			.catch(() => {
				results = null;
			})
			.finally(() => {
				loading = false;
			});
	}

	function onInput() {
		clearTimeout(debounceTimer);
		const q = query.trim();
		if (!q) {
			results = null;
			showPopup = false;
			if (document.activeElement === inputEl) showHistory = true;
			return;
		}
		showHistory = false;
		debounceTimer = setTimeout(() => runSearch(q), isMobile ? 150 : 300);
	}

	function clearSearch() {
		query = '';
		results = null;
		showPopup = false;
		showHistory = false;
		inputEl?.blur();
	}

	function closeOverlays() {
		showPopup = false;
		showHistory = false;
	}

	function goAlbum(id: string) {
		focused = false;
		inputEl?.blur();
		goto(`/albums/${id}`);
	}

	function goArtist(id: string) {
		focused = false;
		inputEl?.blur();
		goto(`/artists/${id}`);
	}

	function playSong(song: Song) {
		closeOverlays();
		if (query.trim()) addSearchHistory(query.trim());
		playNow(song);
	}

	function submitSearch(q: string = query) {
		const trimmed = q.trim();
		if (!trimmed) return;
		addSearchHistory(trimmed);
		closeOverlays();
		if (isMobile) {
			query = trimmed;
			runSearch(trimmed);
			return;
		}
		results = null;
		inputEl?.blur();
		goto(`/search?q=${encodeURIComponent(trimmed)}`);
	}

	function selectHistory(item: string) {
		query = item;
		submitSearch(item);
	}

	function onFocus() {
		refreshHistory();
		if (!query.trim()) {
			showHistory = history.length > 0;
			return;
		}
		if (!isMobile && results) showPopup = true;
	}

	function onBlur() {
		setTimeout(() => {
			showHistory = false;
		}, 150);
	}

	function onBackdropClick() {
		closeOverlays();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') clearSearch();
		if (e.key === 'Enter') submitSearch();
	}

	$effect(() => {
		if (showPopup || showHistory) activeTab = 'all';
	});

	$effect(() => {
		if (variant !== 'desktop') return;
		function handleGlobalKeydown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				inputEl?.focus();
			}
		}
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	$effect(() => {
		if (autofocus) inputEl?.focus();
	});
</script>

<div class="relative">
	<div class="relative flex">
		<div
			class="w-full flex items-center px-3 rounded-lg border bg-zinc-900 text-sm text-zinc-100 placeholder-zinc-500"
			class:border-accent={focused}
			class:border-zinc-800={!focused}
		>
			<Search />
			<input
				bind:this={inputEl}
				type="search"
				enterkeyhint="search"
				placeholder="Search songs, albums, artists..."
				bind:value={query}
				oninput={onInput}
				onkeydown={onKeydown}
				onfocus={onFocus}
				onblur={onBlur}
				bind:focused
				autocomplete="off"
				class="w-full h-full outline-none transition-colors bg-transparent border-none focus:ring-0"
			/>
		</div>
		{#if query}
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={clearSearch}
				aria-label="Clear search"
				class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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
		{/if}
	</div>

	<SearchPopup
		{variant}
		bind:showPopup={focused}
		showHistory={showHistory && history.length > 0}
		{results}
		{loading}
		bind:activeTab
		{query}
		bind:focused
		{history}
		onclose={closeOverlays}
		onselecthistory={selectHistory}
		onremovehistory={refreshHistory}
		onplay={playSong}
		ongoalbum={goAlbum}
		ongoartist={goArtist}
	/>
</div>
