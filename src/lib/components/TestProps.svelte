<script lang="ts">
	let { visible, onClose }: { visible: boolean; onClose: () => void } = $props();
	let foo = $state('bar');
</script>

{#if visible}
<div>test</div>
{/if}
