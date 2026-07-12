import type {
	SubsonicResponse,
	ArtistsIndex,
	Artist,
	Album,
	Song,
	Playlist,
	UpdateManifest
} from '$lib/types';
import {
	getServerUrl,
	getServerAuth,
	isCacheEnabled,
	isProxyEnabled
} from '$lib/stores/settings.svelte';
import { withCache } from '$lib/cache';

export function getBase(): string {
	if (isProxyEnabled()) {
		return '/api/proxy';
	}
	return getServerUrl();
}

function addAuthParams(url: URL) {
	const auth = getServerAuth();
	if (auth?.username) {
		url.searchParams.set('u', auth.username);
		url.searchParams.set('p', auth.password);
	}
}

function addAuthHeaders(headers: Record<string, string>): Record<string, string> {
	const auth = getServerAuth();
	if (auth?.username) {
		const token = btoa(`${auth.username}:${auth.password}`);
		headers['Authorization'] = `Basic ${token}`;
	}
	return headers;
}

import { setConnected, setError } from '$lib/stores/connection.svelte';

async function subsonicFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
	if (endpoint === 'getArtists') {
		console.log(
			"The 'subsonicFetch' function has been called with endpoint 'getArtists' and params:",
			params
		);
	}
	const BASE = getBase();
	const url = new URL(`${BASE}/rest/${endpoint}`);
	url.searchParams.set('f', 'json');
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}
	addAuthParams(url);
	let res: Response;
	try {
		res = await fetch(url.toString(), { headers: addAuthHeaders({}) });
	} catch (e) {
		setError('Cannot reach the server. Check your connection and server URL.');
		throw e;
	}
	if (res.status === 401) {
		setError('Authentication failed. Check your username and password in Settings.');
		throw new Error('Authentication failed');
	}
	if (!res.ok) {
		setError(`Server returned ${res.status}. Check your server URL in Settings.`);
		throw new Error(`HTTP ${res.status}`);
	}
	let data: SubsonicResponse;
	try {
		data = await res.json();
	} catch {
		setError('Server returned an invalid response. Check your server URL in Settings.');
		throw new Error('Invalid JSON response');
	}
	const body = data['subsonic-response'];
	if (body.status === 'failed') {
		const msg = body.error?.message || 'Unknown error';
		setError(`Server error: ${msg}`);
		throw new Error(msg);
	}
	setConnected(true);
	if (endpoint === 'getArtists') {
		console.log(
			"The 'subsonicFetch' function has returned the following data for endpoint 'getArtists':",
			body
		);
	}
	return body as unknown as T;
}

export async function getArtists(): Promise<ArtistsIndex[]> {
	console.log("The 'getArtists' function has been called :)))))");
	const res = await withCache(
		'artists',
		() =>
			subsonicFetch<{ artists: { ignoredArticles: string; index: ArtistsIndex[] } }>('getArtists'),
		undefined,
		isCacheEnabled()
	);
	console.log(
		"The 'getArtists' function has returned the following data!!:",
		res.data.artists.index
	);
	return res.data.artists.index;
}

export async function getArtist(id: string): Promise<Artist> {
	const res = await withCache(
		`artist_${id}`,
		() => subsonicFetch<{ artist: Artist }>('getArtist', { id }),
		undefined,
		isCacheEnabled()
	);
	return res.data.artist;
}

export async function getAlbum(id: string): Promise<Album> {
	const res = await withCache(
		`album_${id}`,
		() => subsonicFetch<{ album: Album }>('getAlbum', { id }),
		undefined,
		isCacheEnabled()
	);
	return res.data.album;
}

export async function refreshAlbum(id: string): Promise<Album> {
	const res = await subsonicFetch<{ album: Album }>('getAlbum', { id });
	return res.album;
}

export async function getAlbumList(
	type: string = 'newest',
	size: number = 50,
	offset: number = 0
): Promise<Album[]> {
	const cacheKey = `albumList_${type}_${size}_${offset}`;
	const res = await withCache(
		cacheKey,
		() =>
			subsonicFetch<{ albumList2: { album: Album[] } }>('getAlbumList2', {
				type,
				size: String(size),
				offset: String(offset)
			}),
		undefined,
		isCacheEnabled()
	);
	return res.data.albumList2.album;
}

export async function getRandomSongs(size: number = 20): Promise<Song[]> {
	const res = await subsonicFetch<{ randomSongs: { song: Song[] } }>('getRandomSongs', {
		size: String(size)
	});
	return res.randomSongs.song;
}

export function getStreamUrl(id: string): string {
	const base = typeof window !== 'undefined' ? `${window.location.origin}/api/proxy` : getBase();
	const url = new URL(`${base}/rest/stream`);
	url.searchParams.set('id', id);
	addAuthParams(url);
	return url.toString();
}

export function getCoverArtUrl(id: string, size?: number): string {
	const base = typeof window !== 'undefined' ? `${window.location.origin}/api/proxy` : getBase();
	const url = new URL(`${base}/rest/getCoverArt`);
	url.searchParams.set('id', id);
	if (size) {
		url.searchParams.set('size', String(size));
	}
	addAuthParams(url);
	return url.toString();
}

export async function searchAll(
	query: string
): Promise<{ artist: Artist[]; album: Album[]; song: Song[] }> {
	const res = await subsonicFetch<{
		searchResult2: { artist: Artist[]; album: Album[]; song: Song[] };
	}>('search2', {
		query,
		artistCount: '10',
		albumCount: '10',
		songCount: '10'
	});
	return res.searchResult2;
}

export async function getCounts(): Promise<{
	songCount: number;
	albumCount: number;
	artistCount: number;
}> {
	const res = await withCache(
		'counts',
		() =>
			subsonicFetch<{ counts: { songCount: number; albumCount: number; artistCount: number } }>(
				'getCounts'
			),
		60 * 1000,
		isCacheEnabled()
	);
	return res.data.counts;
}

export async function getAllSongs(size: number = 500): Promise<Song[]> {
	const cacheKey = `allSongs_${size}`;
	const res = await withCache(
		cacheKey,
		() =>
			subsonicFetch<{ searchResult2: { artist: Artist[]; album: Album[]; song: Song[] } }>(
				'search2',
				{
					query: '',
					artistCount: '0',
					albumCount: '0',
					songCount: String(size)
				}
			),
		undefined,
		isCacheEnabled()
	);
	return res.data.searchResult2.song;
}

export async function getSongsWithLyrics(): Promise<string[]> {
	const res = await withCache(
		'songsWithLyrics',
		() => subsonicFetch<{ songsWithLyrics: { songId: string[] } }>('getSongsWithLyrics'),
		60 * 1000,
		isCacheEnabled()
	);
	return res.data.songsWithLyrics.songId;
}

export async function getDiscordStatus(): Promise<boolean> {
	try {
		const BASE = getBase();
		const url = new URL(`${BASE}/rest/getDiscordStatus`);
		url.searchParams.set('f', 'json');
		addAuthParams(url);
		const res = await fetch(url.toString(), { headers: addAuthHeaders({}) });
		const data = await res.json();
		return data['subsonic-response']?.discordStatus?.connected ?? false;
	} catch {
		return false;
	}
}

export async function disconnectDiscord(): Promise<void> {
	const BASE = getBase();
	const url = new URL(`${BASE}/rest/disconnectDiscord`);
	url.searchParams.set('f', 'json');
	addAuthParams(url);
	await fetch(url.toString(), { method: 'POST', headers: addAuthHeaders({}) });
}

export async function downloadOnServer(id: string): Promise<{ status: string }> {
	const BASE = getBase();
	const url = new URL(`${BASE}/rest/downloadOnServer`);
	url.searchParams.set('id', id);
	url.searchParams.set('f', 'json');
	addAuthParams(url);
	const res = await fetch(url.toString(), { headers: addAuthHeaders({}) });
	const data = await res.json();
	return data['subsonic-response']?.downloadStatus ?? { status: 'unknown' };
}

export async function downloadAlbumOnServer(
	albumId: string
): Promise<{ status: string; started?: number; total?: number }> {
	const BASE = getBase();
	const url = new URL(`${BASE}/rest/downloadAlbumOnServer`);
	url.searchParams.set('id', albumId);
	url.searchParams.set('f', 'json');
	addAuthParams(url);
	const res = await fetch(url.toString(), { headers: addAuthHeaders({}) });
	const data = await res.json();
	return data['subsonic-response']?.downloadStatus ?? { status: 'unknown' };
}

export async function starSong(id: string): Promise<void> {
	await subsonicFetch('star', { id });
}

export async function unstarSong(id: string): Promise<void> {
	await subsonicFetch('unstar', { id });
}

export async function removeSong(id: string): Promise<void> {
	await subsonicFetch('removeSong', { id });
}

export async function toggleStar(song: Song): Promise<void> {
	if (song.starred) {
		await unstarSong(song.id);
		song.starred = false;
	} else {
		await starSong(song.id);
		song.starred = true;
	}
}

export async function getArtistMusicBrainzAlbums(
	artistId: string
): Promise<{ added: string[]; skipped: string[]; error?: string }> {
	const BASE = getBase();
	const url = new URL(`${BASE}/rest/getArtistMusicBrainzAlbums`);
	url.searchParams.set('id', artistId);
	url.searchParams.set('f', 'json');
	addAuthParams(url);
	const res = await fetch(url.toString(), { headers: addAuthHeaders({}) });
	const data = await res.json();
	return data['subsonic-response']?.artistMusicBrainzAlbums ?? { added: [], skipped: [] };
}

export async function getPlaylists(): Promise<Playlist[]> {
	const res = await subsonicFetch<{ playlists: { playlist: Playlist[] } }>('getPlaylists');
	return res.playlists.playlist ?? [];
}

export async function getPlaylist(id: string): Promise<Playlist> {
	const res = await subsonicFetch<{ playlist: Playlist }>('getPlaylist', { id });
	return res.playlist;
}

export async function createPlaylist(name: string, songIds: string[] = []): Promise<Playlist> {
	const params: Record<string, string> = { name };
	if (songIds.length > 0) params.songId = songIds.join(',');
	const res = await subsonicFetch<{ playlist: Playlist }>('createPlaylist', params);
	return res.playlist;
}

export async function updatePlaylist(
	playlistId: string,
	opts: { name?: string; comment?: string; public?: boolean; songIds?: string[] }
): Promise<void> {
	const params: Record<string, string> = { playlistId };
	if (opts.name !== undefined) params.name = opts.name;
	if (opts.comment !== undefined) params.comment = opts.comment;
	if (opts.public !== undefined) params.public = String(opts.public);
	if (opts.songIds !== undefined) params.songId = opts.songIds.join(',');
	await subsonicFetch('updatePlaylist', params);
}

export async function deletePlaylist(id: string): Promise<void> {
	await subsonicFetch('deletePlaylist', { id });
}

export async function addToPlaylist(playlistId: string, songIds: string[]): Promise<void> {
	await subsonicFetch('addToPlaylist', { playlistId, songId: songIds.join(',') });
}

export async function removeFromPlaylist(playlistId: string, indices: number[]): Promise<void> {
	await subsonicFetch('removeFromPlaylist', {
		playlistId,
		index: indices.join(',')
	});
}

export async function getLyrics(
	songId: string
): Promise<{ plainLyrics: string; syncedLyrics: string } | null> {
	try {
		const res = await subsonicFetch<{
			lyrics: { songId: string; plainLyrics: string; syncedLyrics: string };
		}>('getLyrics', { id: songId });
		return res.lyrics;
	} catch {
		return null;
	}
}

async function azaleaFetch<T>(endpoint: string, opts?: RequestInit): Promise<T> {
	const BASE = getBase();
	const url = new URL(`${BASE}${endpoint}`);
	addAuthParams(url);
	const headers = {
		...addAuthHeaders({}),
		...(opts?.headers as Record<string, string> | undefined)
	};
	const res = await fetch(url.toString(), { ...opts, headers });
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
	return data as T;
}

export async function getUpdateManifest(): Promise<UpdateManifest> {
	return azaleaFetch<UpdateManifest>('/update/manifest');
}

export async function setUpdateChannel(channel: string): Promise<{ status: string }> {
	return azaleaFetch<{ status: string }>('/update/channel', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ channel })
	});
}

export async function triggerUpdate(): Promise<{
	status: string;
	message: string;
	version: string;
}> {
	return azaleaFetch<{ status: string; message: string; version: string }>('/update/trigger', {
		method: 'POST'
	});
}

export async function importPlaylist(
	name: string,
	type: 'link' | 'textual',
	content: string
): Promise<{ status: string; playlist: Playlist }> {
	return azaleaFetch<{ status: string; playlist: Playlist }>('/rest/importPlaylist', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ name, type, content })
	});
}
