<script lang="ts">
	import { page } from '$app/stores';
	import {
		getServerUrl,
		setServerUrl,
		isProxyEnabled,
		setProxyEnabled,
		getAccentColor,
		setAccentColor,
		isMediaSessionEnabled,
		setMediaSessionEnabled,
		getRandomQueueSize,
		setRandomQueueSize,
		getServerAuth,
		setServerAuth,
		getRoundedAlbumCovers,
		setRoundedAlbumCovers,
		getRoundedUiElements,
		setRoundedUiElements,
		getArtistImageDisplay,
		setArtistImageDisplay,
		isEndlessQueueEnabled,
		setEndlessQueueEnabled,
		getFontFamily,
		setFontFamily,
		isCacheEnabled,
		setCacheEnabled,
		isAutoplayOnLoadEnabled,
		setAutoplayOnLoadEnabled,
		getFavouriteSongStyle,
		setFavouriteSongStyle,
		isGradientsEnabled,
		setGradientsEnabled
	} from '$lib/stores/settings.svelte';
	import { titleEnding, version } from '$lib/stores/settings.svelte';
	import { clearNextUp, refillNextUp } from '$lib/stores/player.svelte';
	import { clearCache } from '$lib/cache';
	import { getUpdateManifest, setUpdateChannel, triggerUpdate } from '$lib/api';
	import { getUpdateStatus, resetUpdateStatus, setUpdateStatus } from '$lib/stores/update.svelte';
	import UpdateWatcher from '$lib/components/UpdateWatcher.svelte';
	import { toast } from 'svelte-sonner';
	import type { UpdateManifest } from '$lib/types';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';

	let serverUrl = $state(getServerUrl());
	let proxyEnabled = $state(isProxyEnabled());
	let accentColor = $state(getAccentColor());
	let mediaSessionEnabled = $state(isMediaSessionEnabled());
	let randomQueueSize = $state(getRandomQueueSize());
	let endlessQueueEnabled = $state(isEndlessQueueEnabled());
	let serverAuth = $state(getServerAuth());
	let serverUsername = $state(serverAuth?.username ?? '');
	let serverPassword = $state(serverAuth?.password ?? '');
	let showPassword = $state(false);

	let discordStatus = $state<{ ok: boolean; message: string } | null>(null);
	let discordCleared = $state(false);
	let roundedAlbumCovers = $state(getRoundedAlbumCovers());
	let roundedUiElements = $state(getRoundedUiElements());
	let artistImageDisplay = $state(getArtistImageDisplay());
	let fontFamily = $state(getFontFamily());
	let cacheEnabled = $state(isCacheEnabled());
	let cacheCleared = $state(false);
	let autoplayOnLoadEnabled = $state(isAutoplayOnLoadEnabled());
	let favouriteSongStyle = $state(getFavouriteSongStyle());
	let gradientsEnabled = $state(isGradientsEnabled());

	let manifest = $state<UpdateManifest | null>(null);
	let selectedChannel = $state('');
	let isCurrentChannel = $derived(selectedChannel === manifest?.serverChannel);
	let checking = $state(false);
	let manifestError = $state('');
	let updateError = $state('');

	let updatePhase = $derived(getUpdateStatus().phase);
	let updateMessage = $derived(getUpdateStatus().message);
	let updating = $derived(updatePhase === 'downloading');
	let updateCompleted = $derived(updatePhase === 'completed');

	$effect(() => {
		setProxyEnabled(proxyEnabled);
	});

	$effect(() => {
		setCacheEnabled(cacheEnabled);
	});

	$effect(() => {
		setAutoplayOnLoadEnabled(autoplayOnLoadEnabled);
	});

	function resetCache() {
		clearCache();
		cacheCleared = true;
		setTimeout(() => (cacheCleared = false), 2000);
	}

	$effect(() => {
		if (discordCleared) return;
		const params = $page.url.searchParams;
		const status = params.get('discord');
		if (status === 'success') {
			discordStatus = { ok: true, message: 'Discord connected successfully!' };
		} else if (status === 'error') {
			discordStatus = { ok: false, message: params.get('message') || 'Failed to connect Discord' };
		}
	});

	function dismissDiscordStatus() {
		discordStatus = null;
		discordCleared = true;
		history.replaceState(null, '', '/settings');
	}

	function saveServerUrl() {
		setServerUrl(serverUrl);
	}

	function toggleShowPassword() {
		showPassword = !showPassword;
	}

	function handleColorChange(e: Event) {
		const target = e.target as HTMLInputElement;
		accentColor = target.value;
		setAccentColor(accentColor);
	}

	$effect(() => {
		setMediaSessionEnabled(mediaSessionEnabled);
	});

	$effect(() => {
		setServerAuth({ username: serverUsername, password: serverPassword });
	});

	$effect(() => {
		setRoundedAlbumCovers(roundedAlbumCovers);
	});

	$effect(() => {
		setRoundedUiElements(roundedUiElements);
	});

	$effect(() => {
		setArtistImageDisplay(artistImageDisplay);
	});

	$effect(() => {
		setFavouriteSongStyle(favouriteSongStyle);
	});

	$effect(() => {
		setGradientsEnabled(gradientsEnabled);
	});

	function loadLocal<T>(key: string, fallback: T): T {
		if (typeof window === 'undefined') return fallback;
		try {
			const v = localStorage.getItem(key);
			return v !== null ? (JSON.parse(v) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	function saveLocal<T>(key: string, value: T) {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	}

	async function handleCheckUpdates() {
		checking = true;
		manifestError = '';
		resetUpdateStatus();
		updateError = '';
		try {
			manifest = await getUpdateManifest();
			selectedChannel = manifest.serverChannel || Object.keys(manifest.channels)[0] || '';
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to check for updates';
			manifestError = msg;
			toast.error('Failed to check for updates', { description: msg });
		} finally {
			checking = false;
		}
	}

	async function handleSwitchChannel() {
		resetUpdateStatus();
		updateError = '';
		try {
			await setUpdateChannel(selectedChannel);
			saveLocal('updateChannel', selectedChannel);
			resetUpdateStatus();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to switch channel';
			updateError = msg;
			toast.error('Failed to switch channel', { description: msg });
		}
	}

	async function handleTriggerUpdate() {
		resetUpdateStatus();
		updateError = '';
		try {
			await triggerUpdate();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Failed to trigger update';
			updateError = msg;
			toast.error('Failed to trigger update', { description: msg });
		}
	}

	function latestVersion(versions: string[]): string {
		return versions.reduce((a, b) => {
			const pa = a.match(/(\d+(?:\.\d+)*)/)?.[1] || '0';
			const pb = b.match(/(\d+(?:\.\d+)*)/)?.[1] || '0';
			const na = pa.split('.').map(Number);
			const nb = pb.split('.').map(Number);
			for (let i = 0; i < Math.max(na.length, nb.length); i++) {
				if ((na[i] || 0) > (nb[i] || 0)) return a;
				if ((na[i] || 0) < (nb[i] || 0)) return b;
			}
			return b;
		});
	}

	function parseVersion(v: string): number[] {
		const match = v.match(/(\d+(?:\.\d+)*)([a-z]?)/);
		if (!match) return [0];
		const nums = match[1].split('.').map(Number);
		const suffix = match[2];
		const suffixVal = suffix === 'a' ? 0 : suffix === 'b' ? 1 : 2;
		return [...nums, suffixVal];
	}

	function isNewerVersion(a: string, b: string): boolean {
		const pa = parseVersion(a);
		const pb = parseVersion(b);
		for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
			if ((pa[i] || 0) > (pb[i] || 0)) return true;
			if ((pa[i] || 0) < (pb[i] || 0)) return false;
		}
		return false;
	}

	let latestAvailable = $derived(
		manifest && manifest.channels[selectedChannel]?.versions?.length
			? latestVersion(manifest.channels[selectedChannel].versions)
			: ''
	);

	let hasUpdate = $derived(latestAvailable ? isNewerVersion(latestAvailable, version) : false);
</script>

<svelte:head>
	<title>Settings{titleEnding}</title>
</svelte:head>

<h1 class="p-6 text-xl font-bold text-zinc-100">Settings</h1>
<div class="px-6 flex flex-col xl:flex-row gap-8 w-full *:w-full *:flex *:flex-col *:gap-6 mb-10">
	<div>
		<section>
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Connection</h2>
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
				<label class="mb-1 block text-xs text-zinc-400">Azalea Server URL</label>
				<div class="flex gap-2">
					<Input
						type="text"
						bind:value={serverUrl}
						onchange={saveServerUrl}
						placeholder="http://localhost:3443"
					/>
				</div>

				<hr class="my-4 border-zinc-800" />

				<label class="mb-1 block text-xs text-zinc-400">Username</label>
				<Input type="text" bind:value={serverUsername} />
				<label class="mb-1 mt-3 block text-xs text-zinc-400">Password</label>
				<div class="relative">
					<Input type={showPassword ? 'text' : 'password'} bind:value={serverPassword} />
					<Button
						variant="ghost"
						class="absolute right-2 top-1/2 -translate-y-1/2"
						onclick={toggleShowPassword}
						aria-label={showPassword ? 'Hide password' : 'Show password'}
					>
						{#if showPassword}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="currentColor"
								><path
									d="M12 6a9.77 9.77 0 0 1 8.94 5.5A9.77 9.77 0 0 1 12 17a9.77 9.77 0 0 1-8.94-5.5A9.77 9.77 0 0 1 12 6m0-2C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4z"
								/></svg
							>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-4 w-4"
								viewBox="0 0 24 24"
								fill="currentColor"
								><path
									d="M12 6c-2.76 0-5.26 1-7.07 2.64L3.5 7.2C5.67 5.31 8.72 4 12 4c5 0 9.27 3.11 11 7.5-1.06 2.88-3.19 5.24-5.6 6.76l-1.41-1.41C18.02 15.91 19.5 13.85 20.22 11.5 18.5 7.11 14.24 4 9.24 4c-.48 0-.96.03-1.43.08L9.93 7.5A7.98 7.98 0 0 1 12 6zM2 3.27L3.28 2 21 19.72 19.73 21 16.9 18.17C14.87 19.33 13 19.92 12 19.92c-5 0-9.27-3.11-11-7.5.9-2.43 2.66-4.45 4.8-5.9L2 3.27z"
								/></svg
							>
						{/if}
					</Button>
				</div>
				<p class="mt-2 text-[10px] text-zinc-600">
					Note: These credentials are stored locally in browser settings and are used for Basic auth
					to the server.
				</p>
				<p class="mt-1 text-[10px] text-zinc-600">Restart required for some changes.</p>

				<hr class="my-4 border-zinc-800" />

				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={proxyEnabled} />
					<span class="text-sm text-zinc-200">Proxy all traffic through azalea-web backend</span>
				</label>
				<p class="mt-1 text-[10px] text-zinc-600">
					When enabled, all API requests are routed through the azalea-web server instead of your
					browser. Useful when the Azalea server is not directly accessible from your network.
				</p>
			</div>
		</section>

		<section>
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Playback</h2>
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={mediaSessionEnabled} />
					<span class="text-sm text-zinc-200">Enable Media Session API</span>
				</label>
				<label class="mt-3 flex items-center gap-3">
					<input type="checkbox" bind:checked={autoplayOnLoadEnabled} />
					<span class="text-sm text-zinc-200">Autoplay on page load</span>
				</label>
				<p class="mt-1 text-[10px] text-zinc-600">
					When enabled, resumes playback automatically after reloading the page.
				</p>
				<hr class="my-4 border-zinc-800" />
				<label class="mb-4 flex items-center gap-3">
					<input
						type="checkbox"
						bind:checked={endlessQueueEnabled}
						onchange={() => {
							setEndlessQueueEnabled(endlessQueueEnabled);
							if (endlessQueueEnabled) {
								refillNextUp();
							} else {
								clearNextUp();
							}
						}}
					/>
					<span class="text-sm text-zinc-200">Enable endless queue</span>
				</label>
				<label class="mb-1 block text-xs text-zinc-400">Endless queue size (Next Up)</label>
				<input
					type="number"
					min="1"
					max="100"
					bind:value={randomQueueSize}
					onchange={() => {
						setRandomQueueSize(randomQueueSize);
						if (endlessQueueEnabled) {
							clearNextUp();
							refillNextUp();
						}
					}}
					class="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors accent-ring"
				/>
			</div>
		</section>
		<section>
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Updates</h2>
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
				<label class="mb-1 block text-xs text-zinc-400">Current version</label>
				<p class="text-sm text-zinc-200">{version}</p>

				<hr class="my-4 border-zinc-800" />

				<Button variant="outline" onclick={handleCheckUpdates} disabled={checking}>
					{checking ? 'Checking...' : 'Check for updates'}
				</Button>

				{#if manifest}
					<hr class="my-4 border-zinc-800" />

					<label class="mb-2 block text-xs text-zinc-400">Update channel</label>
					<Select.Root type="single" bind:value={selectedChannel}>
						<Select.Trigger class="w-full">
							<span data-slot="select-value"
								>{manifest.channels[selectedChannel]?.name || selectedChannel}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#each Object.entries(manifest.channels) as [key, channel]}
								<Select.Item value={key}>{channel.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>

					<div class="mt-3 flex flex-wrap gap-2">
						<Button variant="outline" onclick={handleSwitchChannel} disabled={isCurrentChannel}>
							Switch to this channel
						</Button>
						<Button onclick={handleTriggerUpdate} disabled={!hasUpdate || updating}>
							{updating
								? 'Updating...'
								: manifest.channels[selectedChannel]?.versions?.length
									? `Update to ${latestVersion(manifest.channels[selectedChannel].versions)}`
									: 'Update to latest'}
						</Button>
						{#if updating}
							<Button
								variant="destructive"
								onclick={() => setUpdateStatus({ phase: 'aborted' })}
							>
								Cancel
							</Button>
						{/if}
					</div>
				{/if}

				{#if manifestError}
					<p class="mt-2 text-xs text-red-400">{manifestError}</p>
				{/if}
				{#if updateError}
					<p class="mt-2 text-xs text-red-400">{updateError}</p>
				{/if}
				{#if updateMessage}
					<p class="mt-2 text-xs {updatePhase === 'failed' ? 'text-red-400' : 'text-emerald-400'}">
						{updateMessage}
					</p>
				{/if}
			</div>
		</section>
	</div>

	<div>
		<section>
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Appearance</h2>
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
				<label class="mb-2 block text-xs text-zinc-400">Accent Color</label>
				<div class="flex items-center gap-3">
					<input
						type="color"
						value={accentColor}
						oninput={handleColorChange}
						class="h-9 w-9 cursor-pointer rounded border border-zinc-700 bg-transparent p-0.5"
					/>
					<span class="text-xs text-zinc-500">{accentColor}</span>
				</div>

				<hr class="my-4 border-zinc-800" />

				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={roundedAlbumCovers} />
					<span class="text-sm text-zinc-200">Rounded album covers</span>
				</label>

				<label class="mt-3 flex items-center gap-3">
					<input type="checkbox" bind:checked={roundedUiElements} />
					<span class="text-sm text-zinc-200">Rounded UI elements</span>
				</label>

				<hr class="my-4 border-zinc-800" />

				<label class="mb-2 block text-xs text-zinc-400">Artist image display</label>
				<Select.Root type="single" bind:value={artistImageDisplay}>
					<Select.Trigger class="w-full">
						<span data-slot="select-value">{artistImageDisplay}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="circle">Circle</Select.Item>
						<Select.Item value="rounded">Rounded</Select.Item>
						<Select.Item value="square">Square</Select.Item>
					</Select.Content>
				</Select.Root>

				<hr class="my-4 border-zinc-800" />

				<label class="mb-2 block text-xs text-zinc-400">Favourite song style</label>
				<Select.Root type="single" bind:value={favouriteSongStyle}>
					<Select.Trigger class="w-full">
						<span data-slot="select-value">{favouriteSongStyle}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="star">Star</Select.Item>
						<Select.Item value="heart">Heart</Select.Item>
					</Select.Content>
				</Select.Root>

				<hr class="my-4 border-zinc-800" />

				<label class="mb-2 block text-xs text-zinc-400">Font family</label>
				<Input
					type="text"
					placeholder="e.g. Inter, sans-serif"
					bind:value={fontFamily}
					oninput={() => setFontFamily(fontFamily)}
				/>

				<hr class="my-4 border-zinc-800" />

				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={gradientsEnabled} />
					<span class="text-sm text-zinc-200">Cover art gradients</span>
				</label>
			</div>
		</section>

		<section>
			<h2 class="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">Library</h2>
			<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
				<label class="flex items-center gap-3">
					<input type="checkbox" bind:checked={cacheEnabled} />
					<span class="text-sm text-zinc-200">Cache music collection for faster loading</span>
				</label>
				<div class="mt-3 flex items-center gap-3">
					<Button variant="outline" onclick={resetCache}>Reset cache</Button>
					{#if cacheCleared}
						<span class="text-xs text-emerald-400">Cache cleared!</span>
					{/if}
				</div>
			</div>
		</section>
	</div>
</div>
