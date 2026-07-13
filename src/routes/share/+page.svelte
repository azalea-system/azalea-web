<script lang="ts">
  import { page } from "$app/stores";
  import { titleEnding } from "$lib/stores/settings.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { ExternalLink, Copy, Check, Plus } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let albumTitle = $derived($page.url.searchParams.get("albumTitle") ?? "");
  let albumArtist = $derived($page.url.searchParams.get("albumArtist") ?? "");
  let coverArtUrl = $derived($page.url.searchParams.get("coverArtUrl") ?? "");
  let youtubeMusicLink = $derived(
    $page.url.searchParams.get("youtubeMusicLink") ?? "",
  );
  let spotifyLink = $derived($page.url.searchParams.get("spotifyLink") ?? "");

  const logoOverlay = `<div style="background:rgba(0,0,0,0.7);border-radius:12px;padding:12px;display:inline-block"><svg xmlns="http://www.w3.org/2000/svg" width="100" height="89" viewBox="-28 -25 632 562"><path fill="#2e76ff" d="M288 0c17.7 0 32 14.3 32 32v17.7C451.8 63.4 557.7 161 573.9 285.9c2 15.6-17.3 24.4-27.8 12.7c-14-15.6-41.3-26.6-66.1-26.6c-38.7 0-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C359 299.5 326.7 272 288 272s-71 27.5-78.4 64.1c-1.7 8.7-8.7 15.9-17.6 15.9s-15.8-7.2-17.6-15.9C167 299.5 134.7 272 96 272c-24.8 0-52.1 11-66.1 26.7c-10.5 11.7-29.8 2.8-27.8-12.8C18.3 161 124.2 63.4 256 49.7V32c0-17.7 14.3-32 32-32m0 304c12.3 0 23.5 4.6 32 12.2v114.3c0 45-36.5 81.4-81.4 81.4c-30.8 0-59-17.4-72.8-45l-2.3-4.7c-7.9-15.8-1.5-35 14.3-42.9s35-1.5 42.9 14.3l2.3 4.7c3 5.9 9 9.6 15.6 9.6c9.6 0 17.4-7.8 17.4-17.4V316.2c8.5-7.6 19.7-12.2 32-12.2"/></svg></div>`;

  let ogImageUrl = $derived(
    coverArtUrl
      ? `${$page.url.origin}/api/og-image?coverArt=${encodeURIComponent(coverArtUrl)}&overlay=${encodeURIComponent(logoOverlay)}`
      : "",
  );

  let copiedField = $state<string | null>(null);

  function copyToClipboard(label: string, value: string) {
    navigator.clipboard.writeText(value);
    copiedField = label;
    setTimeout(() => {
      if (copiedField === label) copiedField = null;
    }, 2000);
  }
</script>

<svelte:head>
  <title>Azalea Share{titleEnding}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content={albumTitle || "Azalea Share"} />
  <meta
    property="og:description"
    content={albumArtist
      ? `${albumArtist} — shared via Azalea`
      : "Shared via Azalea"}
  />
  {#if ogImageUrl}
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:image:width" content="600" />
    <meta property="og:image:height" content="600" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={albumTitle || "Azalea Share"} />
    <meta
      name="twitter:description"
      content={albumArtist
        ? `${albumArtist} — shared via Azalea`
        : "Shared via Azalea"}
    />
    <meta name="twitter:image" content={ogImageUrl} />
  {/if}
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center p-6">
  <div class="w-full max-w-md">
    <div
      class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center"
    >
      <div class="mb-4 flex gap-2 items-center justify-center zoom-130">
        <img src="/favicon.svg" alt="Azalea Logo" class="h-5" />
        <h1 class="font-bold">Azalea Share</h1>
      </div>
      {#if coverArtUrl}
        <div class="mx-auto mb-6 flex justify-center">
          <div
            class="relative h-56 w-56 overflow-hidden rounded-lg bg-zinc-800 shadow-xl"
          >
            <img
              src={coverArtUrl}
              alt={albumTitle || "Album cover"}
              class="h-full w-full object-cover"
              onerror={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      {/if}

      {#if albumTitle}
        <h1 class="mb-1 truncate text-2xl font-bold text-zinc-100">
          {albumTitle}
        </h1>
      {/if}

      {#if albumArtist}
        <p class="mb-6 truncate text-sm text-zinc-400">{albumArtist}</p>
      {:else}
        <div class="mb-6"></div>
      {/if}

      {#if youtubeMusicLink || spotifyLink}
        <div class="flex flex-col gap-3">
          <Button
            variant="outline"
            class="mt-2 rounded-full w-full justify-baseline"
            onclick={() =>
              toast.info(
                "Adding to your Azalea instance is not available yet.",
              )}
          >
            <img src="/favicon.svg" alt="Azalea Logo" class="h-4 w-4" />
            Add to my Azalea Instance
          </Button>
          {#if youtubeMusicLink}
            <div class="flex">
              <Button
                href={youtubeMusicLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                class="flex-1 justify-baseline gap-2 rounded-l-full! border-r-0"
              >
                <svg
                  width="1.1em"
                  height="1.1em"
                  viewBox="0 0 176 176"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle fill="#FF0000" cx="88" cy="88" r="88" />
                  <path
                    fill="#FFFFFF"
                    d="M88,46c23.1,0,42,18.8,42,42s-18.8,42-42,42s-42-18.8-42-42S64.9,46,88,46 M88,42c-25.4,0-46,20.6-46,46s20.6,46,46,46s46-20.6,46-46S113.4,42,88,42L88,42z"
                  />
                  <polygon fill="#FFFFFF" points="72,111 111,87 72,65" />
                </svg>
                Listen on YouTube Music
                <ExternalLink class="h-3.5 w-3.5 text-zinc-500" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                class="rounded-r-full! border-l-0"
                onclick={() => copyToClipboard("youtube", youtubeMusicLink)}
              >
                {#if copiedField === "youtube"}
                  <Check class="h-4 w-4 text-green-500" />
                {:else}
                  <Copy class="h-4 w-4" />
                {/if}
              </Button>
            </div>
          {/if}

          {#if spotifyLink}
            <div class="flex">
              <Button
                href={spotifyLink}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                class="flex-1 justify-baseline gap-2 rounded-l-full! border-r-0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1.3em"
                  height="1.3em"
                  viewBox="0 0 256 256"
                >
                  <g fill="none">
                    <rect width="256" height="256" fill="#242938" rx="60" />
                    <path
                      fill="#1ed760"
                      d="M128 33c-52.442 0-95 42.558-95 95s42.558 95 95 95s95-42.558 95-95s-42.558-95-95-95"
                    />
                    <path
                      fill="#000"
                      d="M188.754 118.462c-1.992 0-3.218-.498-4.942-1.494c-27.274-16.281-76.038-20.188-107.602-11.377c-1.38.383-3.103.996-4.942.996c-5.056 0-8.925-3.946-8.925-9.04c0-5.21 3.217-8.16 6.665-9.156c13.484-3.946 28.577-5.823 45.01-5.823c27.964 0 57.268 5.823 78.681 18.311c2.988 1.724 4.942 4.099 4.942 8.657c0 5.21-4.214 8.926-8.887 8.926m-11.875 29.189c-1.992 0-3.333-.881-4.712-1.609c-23.941-14.173-59.643-19.881-91.399-11.262c-1.839.498-2.835.996-4.558.996c-4.1 0-7.432-3.333-7.432-7.431c0-4.099 1.992-6.819 5.938-7.93c10.649-2.988 21.528-5.21 37.463-5.21c24.861 0 48.879 6.168 67.803 17.43c3.103 1.839 4.328 4.214 4.328 7.546c-.038 4.137-3.256 7.47-7.431 7.47m-10.305 25.129c-1.608 0-2.604-.498-4.098-1.379c-23.904-14.403-51.714-15.016-79.18-9.385c-1.494.383-3.447.996-4.558.996c-3.716 0-6.053-2.95-6.053-6.053c0-3.945 2.337-5.822 5.21-6.435c31.373-6.933 63.436-6.321 90.786 10.036c2.337 1.494 3.716 2.835 3.716 6.321s-2.72 5.899-5.823 5.899"
                    />
                  </g>
                </svg>
                Listen on Spotify
                <ExternalLink class="h-3.5 w-3.5 text-zinc-500" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                class="rounded-r-full! border-l-0"
                onclick={() => copyToClipboard("spotify", spotifyLink)}
              >
                {#if copiedField === "spotify"}
                  <Check class="h-4 w-4 text-green-500" />
                {:else}
                  <Copy class="h-4 w-4" />
                {/if}
              </Button>
            </div>
          {/if}
        </div>
      {:else if !albumTitle && !coverArtUrl}
        <p class="text-sm text-zinc-500">No album information provided.</p>
      {/if}
    </div>

    <p class="mt-4 text-center text-xs text-zinc-600">Shared via Azalea</p>
  </div>
</div>
