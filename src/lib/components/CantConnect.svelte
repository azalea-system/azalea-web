<script lang="ts">
	import { getConnectionState, setConnected } from '$lib/stores/connection.svelte';
	import { X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let conn = $derived(getConnectionState());
</script>

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
