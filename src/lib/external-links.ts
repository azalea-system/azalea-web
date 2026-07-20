export const EXTERNAL_LINK_TYPES: Record<string, string> = {
	allmusic: 'AllMusic',
	discogs: 'Discogs',
	wikidata: 'Wikidata',
	'amazon asin': 'Amazon',
	'discography entry': 'Discography',
	lyrics: 'Lyrics',
	'other databases': 'Other Databases'
};

export const OTHER_DATABASES_DOMAINS: Array<{ pattern: RegExp; name: string }> = [
	{ pattern: /rateyourmusic\.com/, name: 'Rate Your Music' },
	{ pattern: /musik-sammler\.de/, name: 'Musik-Sammler' },
	{ pattern: /spirit-of-rock\.com/, name: 'Spirit of Rock' }
];
