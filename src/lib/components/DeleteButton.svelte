<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Trash2 } from '@lucide/svelte';

	let {
		open = $bindable(false),
		action = () => {},
		title = 'Are you sure?',
		desc = 'This action is permanent',
		cancelText = 'Cancel',
		actionText = 'Delete',
		variant = 'outline',
		buttonText = '',
		className = ''
	}: {
		open: boolean;
		action: (e: MouseEvent) => void;
		title: string;
		desc: string;
		cancelText: string;
		actionText: string;
		variant: string;
		buttonText: string;
		className: string;
	} = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Trigger>
		<Button
			{variant}
			onclick={(e) => {
				e.stopPropagation();
				open = true;
			}}
			class="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-300 flex gap-2 {className}"
		>
			<Trash2 class="h-4 w-4" />
			{#if buttonText}
				<span>{buttonText}</span>
			{/if}
		</Button>
	</AlertDialog.Trigger>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{desc}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{cancelText}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={(e) => {
					open = false;
					action(e);
				}}>{actionText}</AlertDialog.Action
			>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
