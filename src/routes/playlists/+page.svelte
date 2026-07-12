<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getPlaylists, createPlaylist, deletePlaylist } from '$lib/api';
	import { titleEnding } from '$lib/stores/settings.svelte';
	import { ListMusic, Plus, Download } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import ImportPlaylistDialog from '$lib/components/ImportPlaylistDialog.svelte';
	import type { Playlist } from '$lib/types';

	let playlists = $state<Playlist[]>([]);
	let loading = $state(true);

	let showCreate = $state(false);
	let showImport = $state(false);
	let newName = $state('');

	async function refreshPlaylists() {
		try {
			playlists = await getPlaylists();
		} catch (e) {
			console.error('Failed to fetch playlists', e);
		} finally {
			loading = false;
		}
	}

	onMount(refreshPlaylists);

	function formatDuration(seconds: number): string {
		const m = Math.floor(seconds / 60);
		const h = Math.floor(m / 60);
		if (h > 0) return `${h}h ${m % 60}m`;
		return `${m} min`;
	}

	async function handleCreate() {
		const name = newName.trim();
		if (!name) return;
		try {
			const p = await createPlaylist(name);
			playlists = [...playlists, p];
			showCreate = false;
			newName = '';
		} catch (e) {
			console.error('Failed to create playlist', e);
		}
	}

	async function handleDelete(id: string, e: MouseEvent) {
		e.stopPropagation();
		try {
			await deletePlaylist(id);
			playlists = playlists.filter((p) => p.id !== id);
		} catch (e) {
			console.error('Failed to delete playlist', e);
		}
	}
</script>

<svelte:head>
	<title>Playlists{titleEnding}</title>
</svelte:head>

<div class="p-6 max-lg:px-1">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-zinc-100">Playlists</h1>
		<div class="flex items-center gap-2">
			<Button onclick={() => (showImport = true)} variant="outline" class="rounded-full px-4">
				<Download class="h-4 w-4" />
				Import
			</Button>
			<Button
				onclick={() => (showCreate = !showCreate)}
				variant="default"
				class="rounded-full px-4"
			>
				<Plus class="h-4 w-4" />
				New Playlist
			</Button>
		</div>
	</div>

	{#if showCreate}
		<div class="mb-6 flex items-center gap-2">
			<input
				bind:value={newName}
				placeholder="Playlist name..."
				class="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-hidden focus:border-zinc-500"
				onkeydown={(e) => e.key === 'Enter' && handleCreate()}
			/>
			<Button onclick={handleCreate} variant="default" class="rounded-full px-4">Create</Button>
			<Button onclick={() => (showCreate = false)} variant="outline" class="rounded-full px-4"
				>Cancel</Button
			>
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20">
			<div class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600"></div>
		</div>
	{:else if playlists.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-zinc-500">
			<ListMusic class="mb-3 h-12 w-12" />
			<p class="text-sm">No playlists yet</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each playlists as playlist (playlist.id)}
				<div
					onclick={() => goto(`/playlists/${playlist.id}`)}
					class="flex cursor-pointer items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-800/50"
				>
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
						<ListMusic class="h-6 w-6 text-zinc-400" />
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-zinc-100">{playlist.name}</p>
						<p class="text-xs text-zinc-500">
							{playlist.songCount}
							{playlist.songCount === 1 ? 'song' : 'songs'}
							· {formatDuration(playlist.duration)}
						</p>
					</div>
					<DeleteButton
						action={(e) => {
							handleDelete(playlist.id, e);
						}}
					/>
				</div>
			{/each}
		</div>
	{/if}
</div>

<ImportPlaylistDialog bind:open={showImport} onImported={refreshPlaylists} />
