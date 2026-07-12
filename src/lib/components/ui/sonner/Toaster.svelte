<script lang="ts">
	import { Toaster as SonnerToaster, type ToasterProps } from 'svelte-sonner';
	import { cn } from '$lib/utils';

	let {
		theme = 'dark',
		position = 'bottom-right',
		richColors = true,
		closeButton = true,
		class: className,
		...rest
	}: ToasterProps = $props();
</script>

<SonnerToaster
	{theme}
	{position}
	{richColors}
	{closeButton}
	class={cn('toaster group', className)}
	{...rest}
/>
