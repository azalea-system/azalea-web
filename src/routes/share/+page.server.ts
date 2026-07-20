import type { PageServerLoad } from './$types';
import { EXTERNAL_LINK_TYPES, OTHER_DATABASES_DOMAINS } from '$lib/external-links';

interface MusicBrainzRelation {
	type: string;
	'target-type': string;
	url?: { resource: string };
}

interface MusicBrainzReleaseGroup {
	title: string;
	'artist-credit': Array<{ name: string }>;
	relations: MusicBrainzRelation[];
}

const STREAMING_DOMAIN_MAP: Array<{ pattern: RegExp; key: string }> = [
	{ pattern: /open\.spotify\.com/, key: 'spotify' },
	{ pattern: /music\.youtube\.com/, key: 'youtubeMusic' },
	{ pattern: /music\.apple\.com/, key: 'appleMusic' }
];

function extractStreamingLinks(relations: MusicBrainzRelation[]): Record<string, string> {
	const links: Record<string, string> = {};
	for (const rel of relations) {
		if (rel['target-type'] !== 'url' || !rel.url?.resource) continue;
		if (rel.type !== 'streaming' && rel.type !== 'free streaming') continue;
		for (const { pattern, key } of STREAMING_DOMAIN_MAP) {
			if (pattern.test(rel.url.resource) && !(key in links)) {
				links[key] = rel.url.resource;
			}
		}
	}
	return links;
}

export const load: PageServerLoad = async ({ url, fetch }) => {
	const mbid = url.searchParams.get('i');

	if (!mbid) {
		return {
			albumTitle: '',
			albumArtist: '',
			externalLinks: {} as Record<string, string>,
			streamingLinks: {} as Record<string, string>
		};
	}

	try {
		const res = await fetch(
			`https://musicbrainz.org/ws/2/release-group/${mbid}?fmt=json&inc=artist-credits+url-rels`,
			{
				headers: {
					'User-Agent': 'azalea-web/0.0.1 (https://github.com/anomalyco/azalea)'
				}
			}
    );
    if (!res.ok) {
			return {
				albumTitle: '',
				albumArtist: '',
				externalLinks: {} as Record<string, string>,
				streamingLinks: {} as Record<string, string>
			};
		}
		const data: MusicBrainzReleaseGroup = await res.json();
		const albumArtist = data['artist-credit']?.map((a) => a.name).join(', ') ?? '';

		const externalLinks: Record<string, string> = {};
		const usedNames: Record<string, number> = {};
		for (const rel of data.relations ?? []) {
			if (rel['target-type'] !== 'url' || !rel.url?.resource) continue;

			let name: string | undefined;
			if (rel.type === 'other databases') {
				for (const { pattern, name: dbName } of OTHER_DATABASES_DOMAINS) {
					if (pattern.test(rel.url.resource)) {
						name = dbName;
						break;
					}
				}
				if (!name) name = EXTERNAL_LINK_TYPES['other databases'];
			} else {
				name = EXTERNAL_LINK_TYPES[rel.type];
			}
			if (!name) continue;

			const count = usedNames[name] ?? 0;
			usedNames[name] = count + 1;
			const key = count === 0 ? name : `${name}-${count}`;
			externalLinks[key] = rel.url.resource;
		}

		const streamingLinks = extractStreamingLinks(data.relations ?? []);

		return { albumTitle: data.title ?? '', albumArtist, externalLinks, streamingLinks };
	} catch {
		return {
			albumTitle: '',
			albumArtist: '',
			externalLinks: {} as Record<string, string>,
			streamingLinks: {} as Record<string, string>
		};
	}
};
