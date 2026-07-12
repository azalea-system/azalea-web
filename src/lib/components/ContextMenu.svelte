<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { scale } from 'svelte/transition';

	export type ContextMenuItem = {
		label: string;
		icon?: ComponentType;
		action?: () => void;
		disabled?: boolean;
		separator?: boolean;
		children?: ContextMenuItem[];
	};

	let {
		items,
		x,
		y,
		onClose
	}: {
		x: number;
		y: number;
		items: ContextMenuItem[];
		onClose: () => void;
	} = $props();

	let menuEl: HTMLDivElement | undefined = $state();
	let subMenuEl: HTMLDivElement | undefined = $state();
	let posX = $state(x);
	let posY = $state(y);
	let openSubMenu = $state<number | null>(null);
	let subPosX = $state(0);
	let subPosY = $state(0);

	$effect(() => {
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		const pad = 8;
		posX = x;
		posY = y;
		if (rect.right > window.innerWidth - pad) {
			posX = x - rect.width;
		}
		if (rect.bottom > window.innerHeight - pad) {
			posY = y - rect.height;
		}
	});

	$effect(() => {
		if (openSubMenu === null || !menuEl) return;
		const itemEl = menuEl.children[openSubMenu] as HTMLElement;
		if (!itemEl) return;
		const menuRect = menuEl.getBoundingClientRect();
		const itemRect = itemEl.getBoundingClientRect();
		if (menuRect.left < window.innerWidth / 2) {
			subPosX = menuRect.right;
		} else {
			subPosX = menuRect.left;
		}
		subPosY = itemRect.top;
	});

	$effect(() => {
		if (openSubMenu === null || !subMenuEl) return;
		const rect = subMenuEl.getBoundingClientRect();
		const pad = 8;
		if (rect.bottom > window.innerHeight - pad) {
			subPosY = Math.max(pad, window.innerHeight - rect.height - pad);
		}
	});

	function handleClick(index: number, item: ContextMenuItem) {
		if (item.disabled) return;
		if (item.children && item.children.length > 0) {
			openSubMenu = openSubMenu === index ? null : index;
		} else {
			item.action?.();
			onClose();
		}
	}

	function handleEnter(index: number) {
		const item = items[index];
		if (item.children && item.children.length > 0) {
			openSubMenu = index;
		}
	}

	$effect(() => {
		function handleClick(e: MouseEvent) {
			if (menuEl && !menuEl.contains(e.target as Node)) {
				if (subMenuEl && subMenuEl.contains(e.target as Node)) return;
				onClose();
			}
		}
		function handleContextMenu(e: MouseEvent) {
			if (menuEl && !menuEl.contains(e.target as Node)) {
				if (subMenuEl && subMenuEl.contains(e.target as Node)) return;
				e.preventDefault();
				onClose();
			}
		}
		function handleKey(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose();
		}
		window.addEventListener('click', handleClick);
		window.addEventListener('contextmenu', handleContextMenu);
		window.addEventListener('keydown', handleKey);
		return () => {
			window.removeEventListener('click', handleClick);
			window.removeEventListener('contextmenu', handleContextMenu);
			window.removeEventListener('keydown', handleKey);
		};
	});
</script>


<div
	bind:this={menuEl}
	class="fixed min-w-36 rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-zinc-800"
	role="menu"
	tabindex="-1"
	style="left: {posX}px; top: {posY}px; z-index: 60;"
	onclick={(e) => e.stopPropagation()}
	oncontextmenu={(e) => e.stopPropagation()}
	transition:scale={{ start: 0.95, opacity: 0, duration: 100 }}
>
	{#each items as item, i (item.label)}
		{#if item.separator}
			<div class="my-1 h-px bg-zinc-800"></div>
		{:else}
			<button
				onclick={() => handleClick(i, item)}
				onmouseenter={() => handleEnter(i)}
				disabled={item.disabled}
				class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-hidden disabled:cursor-default disabled:opacity-40"
			>
				{#if item.icon}
					<svelte:component this={item.icon} class="h-3.5 w-3.5 shrink-0" />
				{/if}
				<span class="flex-1 text-left">{item.label}</span>
				{#if item.children}
					<svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
				{/if}
			</button>
		{/if}
	{/each}
</div>

{#if openSubMenu !== null && items[openSubMenu]?.children}
	<div
		bind:this={subMenuEl}
		class="fixed min-w-36 rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-zinc-800"
		role="menu"
		tabindex="-1"
		style="left: {subPosX}px; top: {subPosY}px; z-index: 61;"
		onclick={(e) => e.stopPropagation()}
		oncontextmenu={(e) => e.stopPropagation()}
		transition:scale={{ start: 0.95, opacity: 0, duration: 100 }}
	>
		{#each items[openSubMenu].children as child}
			<button
				onclick={() => {
					child.action?.();
					onClose();
				}}
				disabled={child.disabled}
				class="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-hidden disabled:cursor-default disabled:opacity-40"
			>
				{#if child.icon}
					<svelte:component this={child.icon} class="h-3.5 w-3.5 shrink-0" />
				{/if}
				{child.label}
			</button>
		{/each}
	</div>
{/if}
