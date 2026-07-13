<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Player from '$lib/components/Player.svelte';
	import QueueSidebar from '$lib/components/QueueSidebar.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import NowplayingWatcher from '$lib/components/NowplayingWatcher.svelte';
	import DownloadWatcher from '$lib/components/DownloadWatcher.svelte';
	import UpdateWatcher from '$lib/components/UpdateWatcher.svelte';
	import Toaster from '$lib/components/ui/sonner/Toaster.svelte';
	import { getEffectiveSidebarWidth } from '$lib/stores/layout.svelte';
	import { initSettings, appName, getAccentColor, isGradientsEnabled } from '$lib/stores/settings.svelte';
	import { getConnectionState, setConnected } from '$lib/stores/connection.svelte';
	import { getCurrentTrack } from '$lib/stores/player.svelte';
	import { updateGradients, getGradient } from '$lib/stores/colors.svelte';
	import { X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let { children } = $props();
	let rightMargin = $derived(getEffectiveSidebarWidth());
	let conn = $derived(getConnectionState());

	onMount(() => {
		initSettings();

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js');
		}
	});

	function updateFavicon(color: string) {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="576" height="512" viewBox="0 0 576 512"><path fill="${color}" d="M288 0c17.7 0 32 14.3 32 32v17.7C451.8 63.4 557.7 161 573.9 285.9c2 15.6-17.3 24.4-27.8 12.7-14-15.6-41.3-26.6-66.1-26.6-38.7 0-71 27.5-78.4 64.1-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C359 299.5 326.7 272 288 272s-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C167 299.5 134.7 272 96 272c-24.8 0-52.1 11-66.1 26.7c-10.5 11.7-29.8 2.8-27.8-12.8C18.3 161 124.2 63.4 256 49.7V32c0-17.7 14.3-32 32-32m0 304c12.3 0 23.5 4.6 32 12.2v114.3c0 45-36.5 81.4-81.4 81.4c-30.8 0-59-17.4-72.8-45l-2.3-4.7c-7.9-15.8-1.5-35 14.3-42.9s35-1.5 42.9 14.3l2.3 4.7c3 5.9 9 9.6 15.6 9.6c9.6 0 17.4-7.8 17.4-17.4V316.2c8.5-7.6 19.7-12.2 32-12.2"/></svg>`;
		const link = document.querySelector('link[rel="icon"]') || document.createElement('link');
		link.setAttribute('rel', 'icon');
		link.setAttribute('href', `data:image/svg+xml,${encodeURIComponent(svg)}`);
		document.head.appendChild(link);
	}

	$effect(() => {
		const color = getAccentColor();
		updateFavicon(color);
	});

	let _currentCoverArt = $derived.by(() => getCurrentTrack()?.coverArt ?? null);
	let gradient = $derived(getGradient());
	let gradientsEnabled = $derived(isGradientsEnabled());

	$effect(() => {
		_currentCoverArt;
		if (gradientsEnabled) updateGradients();
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.background = gradient && gradientsEnabled ? `${gradient}, #09090b` : '';
	});
</script>

<svelte:head>
	<title>{appName}</title>
	<link rel="icon" href="/favicon.svg" />
	<link rel="manifest" href="/manifest.json" />
	<meta name="darkreader-lock">
</svelte:head>

{#if !conn.connected && conn.error}
	<div
		class="flex items-center gap-3 border-b border-red-900/50 bg-red-950/80 px-4 py-2 text-sm text-red-200"
	>
		<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
			/>
		</svg>
		<span class="flex-1 ml-48">{conn.error}</span>
		<Button
			variant="ghost"
			size="icon"
			class="h-6 w-6 shrink-0 rounded-full"
			onclick={() => setConnected(true)}
		>
			<X class="h-3 w-3" />
		</Button>
	</div>
{/if}

<Sidebar />
<BottomNav />
<main
	class="lg:ml-56 min-h-screen pb-24 lg:pb-20 max-[1023px]:!mr-0 transition-[margin-right] duration-150 bg-zinc-950/80 backdrop-blur-sm"
	style="margin-right: {rightMargin}px"
>
	<div class="hidden px-6 pt-4 pb-2 lg:block">
		<SearchBar />
	</div>
	{@render children()}
</main>
<div class="hidden lg:block">
	<QueueSidebar />
</div>
<Player />
<NowplayingWatcher />
<DownloadWatcher />
<UpdateWatcher />
<Toaster />
