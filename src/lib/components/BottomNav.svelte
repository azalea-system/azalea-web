<script lang="ts">
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-30 flex border-t border-zinc-800 bg-zinc-950 lg:hidden"
	style="padding-bottom: env(safe-area-inset-bottom, 0px)"
>
	<a
		href="/"
		class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors {currentPath ===
		'/'
			? 'text-zinc-100'
			: 'text-zinc-500 hover:text-zinc-300'}"
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"
			><path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg
		>
		Home
	</a>
	<a
		href="/search"
		class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors {currentPath ===
			'/search' || currentPath.startsWith('/search/')
			? 'text-zinc-100'
			: 'text-zinc-500 hover:text-zinc-300'}"
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"
			><path
				d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
			/></svg
		>
		Search
	</a>
	<a
		href="/settings"
		class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors {currentPath ===
		'/settings'
			? 'text-zinc-100'
			: 'text-zinc-500 hover:text-zinc-300'}"
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"
			><path
				d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
			/></svg
		>
		Settings
	</a>
</nav>
