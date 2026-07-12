<script lang="ts">
	import { goto } from '$app/navigation';
	import { getCoverArtUrl, getPlaylists, addToPlaylist, downloadOnServer } from '$lib/api';
	import {
		Star,
		Heart,
		Trash2,
		Play,
		ListPlus,
		ListMusic,
		Copy,
		User,
		Disc,
		Download,
		List
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import ContextMenu from '$lib/components/ContextMenu.svelte';
	import type { ContextMenuItem } from '$lib/components/ContextMenu.svelte';
	import { playNow, queueSongsNext, queueSongsEnd } from '$lib/stores/player.svelte';
	import { isDownloading } from '$lib/stores/downloads.svelte';
	import type { Song } from '$lib/types';

	let {
		song,
		coverSize = 'md',
		showAlbum = false,
		showTrackNumber = false,
		showStar = false,
		showRemove = false,
		showDuration = true,
		isCurrent = false,
		isPlaying = false,
		favStyle = 'star',
		onplay,
		oncontext,
		onartistcontext,
		onsttoggle,
		onremove,
		extraCtxItems = [],
		draggable = false,
		class: className = ''
	}: {
		song: Song;
		coverSize?: 'xs' | 'sm' | 'md' | 'lg';
		showAlbum?: boolean;
		showTrackNumber?: boolean;
		showStar?: boolean;
		showRemove?: boolean;
		showDuration?: boolean;
		isCurrent?: boolean;
		isPlaying?: boolean;
		favStyle?: string;
		onplay?: (song: Song) => void;
		oncontext?: (e: MouseEvent, song: Song) => void;
		onartistcontext?: (e: MouseEvent, song: Song) => void;
		onsttoggle?: (song: Song) => void;
		onremove?: (song: Song) => void;
		extraCtxItems?: ContextMenuItem[];
		draggable?: boolean;
		class?: string;
	} = $props();

	let coverError = $state(false);
	let clickTimer: ReturnType<typeof setTimeout> | null = null;

	let ctxMenu = $state<{
		x: number;
		y: number;
		items: ContextMenuItem[];
	} | null>(null);

	async function handleRowContextMenu(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (oncontext) {
			oncontext(e, song);
			return;
		}
		const items: ContextMenuItem[] = [
			{ label: 'Play now', icon: Play, action: () => playNow(song) },
			{ label: 'Play next', icon: ListPlus, action: () => queueSongsNext([song]) },
			{ label: 'Add to queue', icon: ListMusic, action: () => queueSongsEnd([song]) },
			{
				label: 'Copy title',
				icon: Copy,
				action: () => navigator.clipboard.writeText(song.title)
			},
			{
				label: 'Copy artist',
				icon: Copy,
				action: () => navigator.clipboard.writeText(song.artist)
			},
			{ label: 'Go to album', icon: Disc, action: () => goto('/albums/' + song.album_id) },
			{ label: 'Go to artist', icon: User, action: () => goto('/artists/' + song.artistId) },
			{
				label: 'Add to playlist',
				icon: List,
				children: [{ label: 'Loading...', disabled: true, action: () => {} }]
			}
		];
		if (!song.path) {
			items.push({
				label: isDownloading(song.id) ? 'Downloading...' : 'Download',
				icon: Download,
				action: () => downloadOnServer(song.id),
				disabled: isDownloading(song.id)
			});
		}
		if (extraCtxItems.length) {
			items.push({ separator: true } as ContextMenuItem, ...extraCtxItems);
		}
		ctxMenu = { x: e.clientX, y: e.clientY, items };

		try {
			const playlists = await getPlaylists();
			if (!ctxMenu) return;
			const children =
				playlists.length === 0
					? [{ label: 'No playlists', disabled: true, action: () => {} }]
					: playlists.map((p) => ({
							label: p.name,
							action: () => {
								addToPlaylist(p.id, [song.id]);
								ctxMenu = null;
							}
						}));
			ctxMenu = {
				...ctxMenu,
				items: ctxMenu.items.map((item) =>
					item.label === 'Add to playlist' ? { ...item, children } : item
				)
			};
		} catch {
			if (!ctxMenu) return;
			ctxMenu = {
				...ctxMenu,
				items: ctxMenu.items.map((item) =>
					item.label === 'Add to playlist'
						? { ...item, children: [{ label: 'Failed to load', disabled: true, action: () => {} }] }
						: item
				)
			};
		}
	}

	function handleCoverClick(e: MouseEvent) {
		e.stopPropagation();
		if (window.matchMedia('(pointer: coarse)').matches) {
			onplay?.(song);
			return;
		}
		if (clickTimer) {
			clearTimeout(clickTimer);
			clickTimer = null;
			return;
		}
		clickTimer = setTimeout(() => {
			clickTimer = null;
			onplay?.(song);
		}, 250);
	}

	function fmtDuration(ms: number): string {
		if (!ms || isNaN(ms)) return '0:00';
		const seconds = ms / 1000;
		const m = Math.floor(seconds / 60);
		const s = Math.floor(seconds % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	const coverSizes = {
		xs: { wrapper: 'h-7 w-7' },
		sm: { wrapper: 'h-8 w-8' },
		md: { wrapper: 'h-10 w-10' },
		lg: { wrapper: 'h-14 w-14' }
	};

	const textSizes = {
		xs: { title: 'text-xs', meta: 'text-[10px]' },
		sm: { title: 'text-xs', meta: 'text-[10px]' },
		md: { title: 'text-sm', meta: 'text-xs' },
		lg: { title: 'text-base', meta: 'text-sm' }
	};
</script>

<div
	role="button"
	tabindex="0"
	{...draggable ? { draggable: true } : {}}
	onclick={(e) => {
		if (window.matchMedia('(pointer: coarse)').matches) onplay?.(song);
	}}
	ondblclick={() => onplay?.(song)}
	oncontextmenu={handleRowContextMenu}
	onkeydown={(e) => {
		if (e.key === 'Enter') onplay?.(song);
	}}
	class="flex w-full items-center gap-3 rounded-lg text-left transition-colors hover:bg-zinc-800/50 {isCurrent
		? 'song-row-active'
		: ''} {className}"
>
	{#if showTrackNumber}
		<span
			class="w-6 shrink-0 text-right text-xs tabular-nums {isCurrent
				? 'accent-text'
				: 'text-zinc-500'}">{song.track}</span
		>
	{/if}

	{#if showStar}
		<Button
			variant="ghost"
			size="icon-xs"
			onclick={(e) => {
				e.stopPropagation();
				onsttoggle?.(song);
			}}
			class="text-zinc-500 hover:text-zinc-300"
			aria-label={favStyle === 'heart'
				? song.starred
					? 'Liked'
					: 'Like'
				: song.starred
					? 'Unstar'
					: 'Star'}
		>
			{#if favStyle === 'heart'}
				<Heart class="h-3.5 w-3.5" fill={song.starred ? 'currentColor' : 'none'} />
			{:else}
				<Star class="h-3.5 w-3.5" fill={song.starred ? 'currentColor' : 'none'} />
			{/if}
		</Button>
	{/if}

	<div
		role="button"
		tabindex="0"
		onclick={handleCoverClick}
		onkeydown={(e) => {
			if (e.key === 'Enter') handleCoverClick(e as unknown as MouseEvent);
		}}
		class="relative cover-art flex {coverSizes[coverSize]
			.wrapper} shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[0.2rem] bg-zinc-700"
	>
		{#if !coverError}
			<img
				src={getCoverArtUrl(song.coverArt, 64)}
				alt=""
				class="h-full w-full object-cover rounded-none!"
				style="filter: brightness({!song.path ? 0.25 : isCurrent && isPlaying ? 0.5 : 1})"
				onerror={() => (coverError = true)}
			/>
		{/if}
		{#if isCurrent && isPlaying}
			<div class="absolute inset-0 flex items-end justify-center pb-[0.64rem]">
				<div class="equalizer accent-text">
					<div class="equalizer-bar"></div>
					<div class="equalizer-bar"></div>
					<div class="equalizer-bar"></div>
				</div>
			</div>
		{/if}
	</div>

	<div class="min-w-0 flex-1">
		<p class="truncate {textSizes[coverSize].title} {isCurrent ? 'accent-text' : 'text-zinc-100'}">
			{song.title}
		</p>
		<div class="flex items-center gap-1 overflow-hidden {textSizes[coverSize].meta} text-zinc-400">
			<span
				role="button"
				tabindex="0"
				onclick={(e) => {
					e.stopPropagation();
					goto('/artists/' + song.artistId);
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.stopPropagation();
						goto('/artists/' + song.artistId);
					}
				}}
				class="truncate accent-hover-text cursor-pointer"
				oncontextmenu={(e) => {
					e.stopPropagation();
					onartistcontext?.(e, song);
				}}>{song.artist}</span
			>
			{#if showAlbum}
				<span class="shrink-0 text-zinc-600"> · </span>

				<span
					role="button"
					tabindex="0"
					onclick={(e) => {
						e.stopPropagation();
						goto('/albums/' + song.album_id);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.stopPropagation();
							goto('/albums/' + song.album_id);
						}
					}}
					class="truncate accent-hover-text cursor-pointer"
					oncontextmenu={(e) => {
						e.stopPropagation();
						handleRowContextMenu(e);
					}}>{song.album}</span
				>
			{/if}
		</div>
	</div>

	{#if showDuration}
		<span class="shrink-0 {textSizes[coverSize].meta} text-zinc-500"
			>{fmtDuration(song.duration)}</span
		>
	{/if}

	{#if showRemove}
		<Button
			variant="ghost"
			size="icon-xs"
			onclick={(e) => {
				e.stopPropagation();
				onremove?.(song);
			}}
			title="Remove from queue"
			class="shrink-0 text-zinc-600 opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
		>
			<Trash2 class="h-3 w-3" />
		</Button>
	{/if}
</div>

{#if ctxMenu}
	<ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => (ctxMenu = null)} />
{/if}
