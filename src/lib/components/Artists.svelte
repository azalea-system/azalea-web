<script lang="ts">
	import { getCoverArtUrl } from '$lib/api';
	import type { Artist } from '$lib/types';

	let {
		artists,
		oncontextmenu,
		class: className = '',
	}: {
		artists: Artist[];
		oncontextmenu?: (e: MouseEvent, artist: Artist) => void;
		class?: string;
	} = $props();

	function hideImg(e: Event) {
		(e.currentTarget as HTMLImageElement).style.display = 'none';
	}
</script>

<div
	class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 {className}"
>
	{#each artists as artist (artist.id)}
		<a
			href="/artists/{artist.id}"
			oncontextmenu={(e) => oncontextmenu?.(e, artist)}
			class="group rounded-lg bg-zinc-800/50 p-3 transition-colors hover:bg-zinc-800"
		>
			<div class="relative mb-2 aspect-square overflow-hidden rounded-full bg-zinc-700">
				<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-8 w-8"
						viewBox="0 0 24 24"
						fill="currentColor"
						><path
							d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
						/></svg
					>
				</div>
				<img
					src={getCoverArtUrl(artist.coverArt, 256)}
					alt={artist.name}
					class="relative h-full w-full object-cover"
					onerror={hideImg}
				/>
			</div>
			<p class="truncate text-sm font-medium text-zinc-100">{artist.name}</p>
			<p class="text-xs text-zinc-500">
				{artist.albumCount}
				{artist.albumCount === 1 ? 'album' : 'albums'}
			</p>
		</a>
	{/each}
</div>
