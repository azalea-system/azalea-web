<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';

	import { Button } from '$lib/components/ui/button/index.js';

	import { Textarea } from '$lib/components/ui/textarea/index.js';

	import { Link2, List, Upload, FileText, LoaderCircle } from '@lucide/svelte';
	import { importPlaylist } from '$lib/api';

	let { open = $bindable(false), onImported }: { open?: boolean; onImported?: () => void } = $props();

	let importType = $state<'link' | 'textual'>('link');

	let inputMethod = $state<'file' | 'text'>('text');

	let textContent = $state('');

	let fileName = $state('');

	let fileRef: HTMLInputElement | undefined = $state();

	let playlistName = $state('Imported Playlist');

	let importing = $state(false);

	let error = $state('');

	async function readFileContent(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		fileName = input.files && input.files.length > 0 ? input.files[0].name : '';
	}

	async function handleImport() {
		let content = '';

		if (inputMethod === 'file') {
			if (!fileRef?.files?.length) return;
			try {
				content = await readFileContent(fileRef.files[0]);
			} catch {
				error = 'Failed to read file';
				return;
			}
		} else {
			content = textContent;
		}

		if (!content.trim()) return;

		importing = true;
		error = '';

		try {
			await importPlaylist(playlistName, importType, content);
			open = false;
			textContent = '';
			fileName = '';
			playlistName = 'Imported Playlist';
			onImported?.();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Import failed';
		} finally {
			importing = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Import Playlist</Dialog.Title>
		</Dialog.Header>

		<div class="flex flex-col items-start gap-0.5">
			<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">Playlist Name</span>
			<Input bind:value={playlistName} placeholder="Playlist name" class="w-full" />
		</div>

		<div class="flex flex-col items-start gap-0.5">
			<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">Source Type</span>
			<Tabs.Root bind:value={importType} class="w-full">
				<Tabs.List class="grid w-full grid-cols-2 rounded-md bg-zinc-800 p-1 text-zinc-400">
					<Tabs.Trigger
						value="link"
						class="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
					>
						<Link2 class="h-4 w-4" /> From links
					</Tabs.Trigger>
					<Tabs.Trigger
						value="textual"
						class="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
					>
						<List class="h-4 w-4" /> From song names
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<div class="flex flex-col items-start gap-0.5">
			<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">Input Method</span>
			<Tabs.Root bind:value={inputMethod} class="w-full">
				<Tabs.List class="grid w-full grid-cols-2 rounded-md bg-zinc-800 p-1 text-zinc-400">
					<Tabs.Trigger
						value="file"
						class="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
					>
						<Upload class="h-4 w-4" /> From file
					</Tabs.Trigger>
					<Tabs.Trigger
						value="text"
						class="inline-flex items-center justify-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none data-[state=active]:bg-zinc-700 data-[state=active]:text-zinc-100 data-[state=active]:shadow-sm"
					>
						<FileText class="h-4 w-4" /> From text
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		{#if inputMethod === 'file'}
			<div class="flex flex-col items-start gap-0.5">
				<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">
					{importType === 'link'
						? 'Upload a file containing one link per line'
						: 'Upload a file containing one song per line'}
				</span>
				<div class="h-50 w-full">
					<Input type="file" bind:this={fileRef} onchange={handleFileChange} class="w-full" />
				</div>
				{#if fileName}
					<p class="text-xs text-zinc-500">Selected: {fileName}</p>
				{/if}
			</div>
		{:else}
			<div class="flex flex-col items-start gap-0.5">
				<span class="text-[0.7rem] text-zinc-500 font-bold uppercase">
					{importType === 'link' ? 'Paste links (one per line)' : 'Paste song names (one per line)'}
				</span>

				<Textarea
					bind:value={textContent}
					placeholder={importType === 'link'
						? 'e.g.\nhttps://youtube.com/watch?v=...\nhttps://youtube.com/playlist?list=...\nhttps://example.com/song.mp3\nhttps://bilibili.com/video/...\nSpotify support coming soon...'
						: 'e.g.\nSong Name - Artist\nArtist - Song Name\nArtist - Song Name - Album'}
					class="h-50"
				></Textarea>
			</div>
		{/if}

		{#if error}
			<p class="text-sm text-red-400">{error}</p>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)} disabled={importing}>Cancel</Button>

			<Button onclick={handleImport} disabled={importing || (!fileName && !textContent.trim())}>
				{#if importing}
					<LoaderCircle class="h-4 w-4 animate-spin" />
				{/if}
				{importing ? 'Importing...' : 'Import'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
