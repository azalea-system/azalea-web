<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getCounts } from '$lib/api';
	import { getServerUrl, appName, version } from '$lib/stores/settings.svelte';
	import { getUpdateStatus } from '$lib/stores/update.svelte';
	import { Database, ListMusic, CalendarDays } from '@lucide/svelte';


	let currentPath = $derived($page.url.pathname);

	let albumCount = $state<number | null>(null);
	let artistCount = $state<number | null>(null);
	let songCount = $state<number | null>(null);

	onMount(async () => {
		try {
			const c = await getCounts();
			albumCount = c.albumCount;
			artistCount = c.artistCount;
			songCount = c.songCount;
		} catch {}
	});

	let updateStatus = $derived(getUpdateStatus());
	let showUpdate = $derived(updateStatus.phase === 'downloading');
</script>

<aside
	class="fixed left-0 top-0 z-40 hidden h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950/70 backdrop-blur-sm lg:flex"
>
	<div>
		<div class="flex h-12 items-center gap-2 border-y border-t border-zinc-800 px-4">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 576 512"
				class="w-7 h-7 fill-accent! stroke-current!"
				><path
					d="M288 0c17.7 0 32 14.3 32 32v17.7C451.8 63.4 557.7 161 573.9 285.9c2 15.6-17.3 24.4-27.8 12.7c-14-15.6-41.3-26.6-66.1-26.6c-38.7 0-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C359 299.5 326.7 272 288 272s-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C167 299.5 134.7 272 96 272c-24.8 0-52.1 11-66.1 26.7c-10.5 11.7-29.8 2.8-27.8-12.8C18.3 161 124.2 63.4 256 49.7V32c0-17.7 14.3-32 32-32m0 304c12.3 0 23.5 4.6 32 12.2v114.3c0 45-36.5 81.4-81.4 81.4c-30.8 0-59-17.4-72.8-45l-2.3-4.7c-7.9-15.8-1.5-35 14.3-42.9s35-1.5 42.9 14.3l2.3 4.7c3 5.9 9 9.6 15.6 9.6c9.6 0 17.4-7.8 17.4-17.4V316.2c8.5-7.6 19.7-12.2 32-12.2"
				/></svg
			>

			<span class="text-sm font-semibold text-zinc-100">{appName} {version}</span>
		</div>

		<nav class="space-y-1 p-3">
			<a
				href="/"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
				'/'
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
					><path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg
				>
				Home
			</a>
			<a
				href="/artists"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
					'/artists' || currentPath.startsWith('/artists/')
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"
					><path
						d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0H2zM14 20a6 6 0 0 1 12 0h-12z"
					/></svg
				>
				<span class="flex-1">Artists</span>
				{#if artistCount !== null}
					<span class="text-xs text-zinc-600">({artistCount})</span>
				{/if}
			</a>
			<a
				href="/albums"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
					'/albums' || currentPath.startsWith('/albums/')
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="currentColor"
					><path
						d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"
					/></svg
				>
				<span class="flex-1">Albums</span>
				{#if albumCount !== null}
					<span class="text-xs text-zinc-600">({albumCount})</span>
				{/if}
			</a>
			<a
				href="/songs"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
				'/songs'
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="currentColor"
					><path
						d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
					/></svg
				>
				<span class="flex-1">Songs</span>
				{#if songCount !== null}
					<span class="text-xs text-zinc-600">({songCount})</span>
				{/if}
			</a>
			<a
				href="/years"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
					'/years'
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<CalendarDays class="h-4 w-4" />
				<span class="flex-1">Years</span>
			</a>
			<a
				href="/playlists"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
					'/playlists' || currentPath.startsWith('/playlists/')
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<ListMusic class="h-4 w-4" />
				<span class="flex-1">Playlists</span>
			</a>
			<a
				href="/settings"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors {currentPath ===
				'/settings'
					? 'bg-zinc-800 text-zinc-100'
					: 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="currentColor"
					><path
						d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
					/></svg
				>
				Settings
			</a>
			<a
				href={getServerUrl()}
				target="_blank"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
			>
				<Database class="h-4 w-4 stroke-current" />
				Management Panel
			</a>
		</nav>

		{#if showUpdate}
			<div class="border-t border-zinc-800 px-4 py-3">
				<div class="mb-1 flex items-center justify-between text-xs text-zinc-400">
					<span>Updating...</span>
					<span>{updateStatus.version || ''}</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
					<div
						class="h-full animate-pulse rounded-full bg-accent transition-all duration-500"
						style="width: 100%"
					></div>
				</div>
				<p class="mt-1 truncate text-xs text-zinc-500">{updateStatus.message || 'Downloading...'}</p>
			</div>
		{/if}
	</div>
</aside>
