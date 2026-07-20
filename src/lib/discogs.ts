const STREAMING_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
	{ pattern: /open\.spotify\.com/, key: 'spotify' },
	{ pattern: /music\.youtube\.com/, key: 'youtubeMusic' },
	{ pattern: /music\.apple\.com/, key: 'appleMusic' }
];

function extractStreamingLinksFromUrls(urls: string[]): Record<string, string> {
	const links: Record<string, string> = {};
	for (const url of urls) {
		for (const { pattern, key } of STREAMING_PATTERNS) {
			if (pattern.test(url) && !(key in links)) {
				links[key] = url;
			}
		}
	}
	return links;
}

function collectUrls(data: Record<string, unknown>): string[] {
	const urls: string[] = [];
	if (Array.isArray(data.urls)) urls.push(...data.urls);
	if (Array.isArray(data.tracklist)) {
		for (const track of data.tracklist) {
			if (Array.isArray(track.extraartists)) {
				for (const artist of track.extraartists) {
					if (artist.url) urls.push(artist.url);
				}
			}
		}
	}
	return urls;
}

export async function fetchDiscogsStreamingLinks(
	discogsUrl: string
): Promise<Record<string, string>> {
	const match = discogsUrl.match(/\/(release|master)\/(\d+)/);
	if (!match) return {};

	const [, type, id] = match;
	const endpoint = type === 'master' ? 'masters' : 'releases';

	try {
		const res = await fetch(`https://api.discogs.com/${endpoint}/${id}`, {
			headers: { 'User-Agent': 'Azalea/1.0' }
		});
		if (!res.ok) return {};

		const data = await res.json();
		let allUrls = collectUrls(data);

		if (type === 'master' && data.main_release_url) {
			const releaseRes = await fetch(data.main_release_url, {
				headers: { 'User-Agent': 'Azalea/1.0' }
			});
			if (releaseRes.ok) {
				const releaseData = await releaseRes.json();
				allUrls = allUrls.concat(collectUrls(releaseData));
			}
		}

		return extractStreamingLinksFromUrls(allUrls);
	} catch {
		return {};
	}
}
