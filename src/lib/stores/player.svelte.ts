import type { Song } from '$lib/types';
import { getStreamUrl, getRandomSongs } from '$lib/api';
import {
	getRandomQueueSize,
	isEndlessQueueEnabled,
	isAutoplayOnLoadEnabled
} from './settings.svelte';

let currentTrack: Song | null = $state(null);
let userQueue: Song[] = $state([]);
let nextFromAlbum: Song[] = $state([]);
let nextUp: Song[] = $state([]);
let nextFromLabel = $state('Next from');
let nextUpLabel = $state('Next Up');
let playing = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let targetVolume = $state(1);
let audioElement: HTMLAudioElement | null = null;

let sourceRemaining: Song[] = [];
let trackHistory: Song[] = [];
let _saveInterval: ReturnType<typeof setInterval> | null = null;
let repeatMode: 'off' | 'queue' | 'track' = $state('off');
let shuffleMode: boolean = $state(false);
let _savedNextFromOrder: Song[] = [];
let _refillingNextUp = false;

let toastMessage = $state<string | null>(null);
let _pendingRestoreTime: number | null = null;
let _restoreInProgress = false;
let _playGen = 0;

export function getToastMessage() {
	return toastMessage;
}

export function clearToastMessage() {
	toastMessage = null;
}

export function stop() {
	currentTrack = null;
	playing = false;
	_pendingRestoreTime = null;
	_restoreInProgress = false;
	if (audioElement) {
		audioElement.pause();
		audioElement.src = '';
	}
	userQueue = [];
	nextFromAlbum = [];
	nextUp = [];
	trackHistory = [];
	sourceRemaining = [];
	currentTime = 0;
	duration = 0;
	stopAutoSave();
	saveState();
}

export function clearNextUp() {
	nextUp = [];
}
export async function refillNextUp() {
	if (!isEndlessQueueEnabled()) return;
	const limit = getRandomQueueSize();
	const needed = limit - nextUp.length;
	if (needed <= 0 || _refillingNextUp) return;
	_refillingNextUp = true;
	try {
		const songs = await getRandomSongs(needed + 5);
		const excludeIds = new Set(nextUp.map((s) => s.id));
		if (currentTrack) excludeIds.add(currentTrack.id);
		for (const s of nextFromAlbum) excludeIds.add(s.id);
		for (const s of trackHistory) excludeIds.add(s.id);
		const fresh = songs.filter((s) => !excludeIds.has(s.id));
		const stillNeeded = limit - nextUp.length;
		nextUp.push(...fresh.slice(0, stillNeeded));
	} catch {
	} finally {
		_refillingNextUp = false;
	}
}

export function getCurrentTrack() {
	return currentTrack;
}
export function getCurrentTrackId(): string | null {
	return currentTrack?.id ?? null;
}
export function getUserQueue() {
	return userQueue;
}
export function setCurrentTrack(song: Song | null) {
	currentTrack = song;
	saveState();
}
export function setPlaying(v: boolean) {
	playing = v;
	saveState();
}
export function setQueue(queue: Song[]) {
	userQueue = queue;
	saveState();
}

export function getDisplayedQueue(): Song[] {
	if (currentTrack) return [currentTrack, ...userQueue];
	return [...userQueue];
}

export function getNextFromAlbum() {
	return nextFromAlbum;
}
export function shuffleNextFrom() {
	for (let i = nextFromAlbum.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[nextFromAlbum[i], nextFromAlbum[j]] = [nextFromAlbum[j], nextFromAlbum[i]];
	}
}
export function getNextUp() {
	return nextUp;
}
export function getNextUpLabel() {
	return nextUpLabel;
}
export function getNextFromLabel() {
	return nextFromLabel;
}
export function getRepeatMode() {
	return repeatMode;
}
export function cycleRepeatMode() {
	if (repeatMode === 'off') repeatMode = 'queue';
	else if (repeatMode === 'queue') repeatMode = 'track';
	else repeatMode = 'off';
}
export function setRepeatMode(m: 'off' | 'queue' | 'track') {
	repeatMode = m;
}
export function getShuffleMode() {
	return shuffleMode;
}
export function toggleShuffleMode() {
	shuffleMode = !shuffleMode;
	if (shuffleMode) {
		shuffleNextFrom();
	} else {
		const currentIds = new Set(nextFromAlbum.map((s) => s.id));
		nextFromAlbum = _savedNextFromOrder.filter((s) => currentIds.has(s.id));
	}
}
export function isPlaying() {
	return playing;
}
export function getCurrentTime() {
	return currentTime;
}
export function setCurrentTime(v: number) {
	if (_pendingRestoreTime !== null || _restoreInProgress) return;
	currentTime = v;
}
export function getDuration() {
	return duration;
}
export function setDuration(v: number) {
	duration = v;
}
export function getVolume() {
	return targetVolume;
}
export function setVolume(v: number) {
	targetVolume = v;
	if (audioElement) audioElement.volume = v;
}

function ensureAudioLoaded(): boolean {
	if (!audioElement || !currentTrack) return false;
	const url = getStreamUrl(currentTrack.id);
	const src = audioElement.src;
	if (!src || !src.includes(`id=${currentTrack.id}`)) {
		audioElement.src = url;
	}
	return true;
}

function restorePersistedPlayback() {
	if (!audioElement || !currentTrack || _pendingRestoreTime === null || _restoreInProgress) return;

	_restoreInProgress = true;
	const targetTime = _pendingRestoreTime ?? currentTime;

	const finishRestore = () => {
		_pendingRestoreTime = null;
		_restoreInProgress = false;
		try {
			currentTime = audioElement!.currentTime;
		} catch {}
		setDuration(audioElement!.duration || 0);
		if (playing) {
			audioElement!.play().catch(() => {
				playing = false;
			});
			startAutoSave();
		}
	};

	const applySeek = () => {
		if (targetTime > 0) {
			let finished = false;
			const onSeeked = () => {
				if (finished) return;
				finished = true;
				audioElement!.removeEventListener('seeked', onSeeked);
				finishRestore();
			};
			audioElement!.addEventListener('seeked', onSeeked);
			try {
				audioElement!.currentTime = targetTime;
			} catch {
				onSeeked();
				return;
			}
			setTimeout(onSeeked, 250);
		} else {
			finishRestore();
		}
	};

	if (audioElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
		applySeek();
	} else {
		audioElement.addEventListener(
			'loadedmetadata',
			() => {
				applySeek();
			},
			{ once: true }
		);
	}
}

export function setAudioElement(el: HTMLAudioElement) {
	if (audioElement) {
		const prev = (audioElement as any)._azalea_onTimeUpdate as
			((this: HTMLAudioElement, ev: Event) => any) | undefined;
		if (prev) audioElement.removeEventListener('timeupdate', prev);
	}
	audioElement = el;

	if (!audioElement) return;

	const onTimeUpdate = () => {
		if (_pendingRestoreTime !== null || _restoreInProgress) return;
		try {
			currentTime = audioElement!.currentTime;
			saveState();
		} catch {}
	};
	(audioElement as any)._azalea_onTimeUpdate = onTimeUpdate;
	audioElement.addEventListener('timeupdate', onTimeUpdate);

	audioElement.volume = targetVolume;

	if (currentTrack) {
		ensureAudioLoaded();
		if (_pendingRestoreTime !== null) {
			restorePersistedPlayback();
		}
	}
}

function serializeState() {
	return {
		currentTrack,
		currentTime,
		playing,
		userQueue,
		nextFromAlbum,
		nextFromLabel,
		nextUp,
		nextUpLabel
	};
}
function saveState() {
	try {
		const state = serializeState();
		const jsonState = JSON.stringify(state);

		localStorage.setItem('azalea_player_state', jsonState);
	} catch (e) {
		console.error('Failed to save player state to localStorage:', e);
	}
}
function loadState() {
	try {
		const raw = localStorage.getItem('azalea_player_state');
		if (!raw) {
			return;
		}
		const obj = JSON.parse(raw);
		if (obj.currentTrack) currentTrack = obj.currentTrack;
		if (typeof obj.currentTime === 'number') {
			currentTime = obj.currentTime;
			_pendingRestoreTime = obj.currentTime;
		} else if (obj.currentTrack) {
			_pendingRestoreTime = 0;
		}
		if (typeof obj.playing === 'boolean') playing = obj.playing;
		else if (obj.currentTrack) playing = true;
		if (!isAutoplayOnLoadEnabled()) playing = false;
		if (Array.isArray(obj.userQueue)) userQueue = obj.userQueue;
		if (Array.isArray(obj.nextFromAlbum)) nextFromAlbum = obj.nextFromAlbum;
		if (Array.isArray(obj.nextUp)) nextUp = obj.nextUp;
		if (typeof obj.nextFromLabel === 'string') nextFromLabel = obj.nextFromLabel;
		if (typeof obj.nextUpLabel === 'string') nextUpLabel = obj.nextUpLabel;
	} catch (e) {
		console.error('Failed to load player state from localStorage:', e);
	}
}

loadState();

function startAutoSave() {
	if (_saveInterval) return;
	_saveInterval = setInterval(saveState, 1000);
}
function stopAutoSave() {
	if (!_saveInterval) return;
	clearInterval(_saveInterval);
	_saveInterval = null;
}

export async function playNow(song: Song, context?: Song[]) {
	const gen = ++_playGen;

	toastMessage = null;

	if (audioElement) {
		audioElement.pause();
		audioElement.src = '';
	}

	currentTrack = song;
	playing = true;
	_pendingRestoreTime = null;
	_restoreInProgress = false;
	userQueue = [];
	nextFromAlbum = [];
	trackHistory = [];
	sourceRemaining = [];

	if (context && context.length > 0) {
		const albumId = song.album_id;

		// 1. Filter the context to only include songs from this specific album
		const albumSongs = context.filter((s) => s.album_id === albumId);

		// 2. Sort the songs by disc number, then by track number
		albumSongs.sort((a, b) => {
			// Safely extract disc numbers (default to 1 if missing)
			const discA = (a as any).discNumber ?? (a as any).disc_number ?? (a as any).disc ?? 1;
			const discB = (b as any).discNumber ?? (b as any).disc_number ?? (b as any).disc ?? 1;

			if (discA !== discB) return discA - discB;

			// If on the same disc, sort by track number
			const trackA = (a as any).track_number ?? (a as any).track ?? 0;
			const trackB = (b as any).track_number ?? (b as any).track ?? 0;

			return trackA - trackB;
		});

		// 3. Find where the clicked song sits in our newly sorted timeline
		const idx = albumSongs.findIndex((s) => s.id === song.id);

		if (idx >= 0) {
			const before = albumSongs.slice(0, idx);
			trackHistory.push(...before);

			// This now contains the rest of the current disc, PLUS any subsequent discs in order
			const after = albumSongs.slice(idx + 1);
			nextFromAlbum.push(...after);

			_savedNextFromOrder = [song, ...after];
			if (shuffleMode) shuffleNextFrom();
			nextFromLabel = `Next from: ${context[0]?.album || 'Queue'}`;
		}
	}

	startAutoSave();
	saveState();
	refillNextUp();

	if (audioElement) {
		audioElement.src = getStreamUrl(song.id);
		audioElement.play().catch(() => {
			if (gen !== _playGen) return;
			toastMessage = 'Unable to play track';
			stop();
		});
	}
}

export function playAlbum(tracks: Song[], startIndex = 0) {
	playNow(tracks[startIndex], tracks);
}

export function playNext(song: Song) {
	if (!currentTrack) {
		playNow(song);
		return;
	}
	userQueue.unshift(song);
}
export function addToQueue(song: Song) {
	if (!currentTrack) {
		playNow(song);
		return;
	}
	userQueue.push(song);
}
export function queueSongsNow(songs: Song[]) {
	playNow(songs[0], songs);
}
export function queueSongsNext(songs: Song[]) {
	if (!currentTrack) {
		queueSongsNow(songs);
		return;
	}
	for (let i = songs.length - 1; i >= 0; i--) userQueue.unshift(songs[i]);
}
export function queueSongsEnd(songs: Song[]) {
	if (!currentTrack) {
		queueSongsNow(songs);
		return;
	}
	for (const s of songs) userQueue.push(s);
}
export function removeFromQueue(index: number) {
	if (index >= 0 && index < userQueue.length) userQueue.splice(index, 1);
}

export function moveInQueue(
	song: Song,
	source: 'user' | 'nextFrom' | 'nextUp',
	dropIndex: number
) {
	let sourceArr: Song[];
	if (source === 'user') sourceArr = userQueue;
	else if (source === 'nextFrom') sourceArr = nextFromAlbum;
	else sourceArr = nextUp;

	const sourceIndex = sourceArr.findIndex((s) => s.id === song.id);
	if (sourceIndex === -1) return;

	const targetArr = userQueue;
	const isSameSection = source === 'user';

	sourceArr.splice(sourceIndex, 1);

	let targetIndex = dropIndex;
	if (isSameSection && sourceIndex < dropIndex) {
		targetIndex = Math.max(0, dropIndex - 1);
	}

	targetArr.splice(targetIndex, 0, song);
	saveState();
}

export function togglePlay() {
	if (!audioElement || !currentTrack) return;
	if (playing) {
		try {
			currentTime = audioElement.currentTime;
		} catch {}
		audioElement.pause();
		playing = false;
		stopAutoSave();
		saveState();
	} else {
		if (!ensureAudioLoaded()) return;
		const resume = () => {
			const targetTime = currentTime;
			const start = () => {
				audioElement!.play().catch(() => {});
				playing = true;
				startAutoSave();
				saveState();
			};
			if (targetTime > 0) {
				let finished = false;
				const onSeeked = () => {
					if (finished) return;
					finished = true;
					audioElement!.removeEventListener('seeked', onSeeked);
					start();
				};
				audioElement!.addEventListener('seeked', onSeeked);
				try {
					audioElement!.currentTime = targetTime;
				} catch {
					onSeeked();
					return;
				}
				setTimeout(onSeeked, 250);
			} else {
				start();
			}
		};
		if (audioElement.readyState >= HTMLMediaElement.HAVE_METADATA) resume();
		else audioElement.addEventListener('loadedmetadata', resume, { once: true });
	}
}

export async function nextTrack() {
	const gen = ++_playGen;
	if (!currentTrack) return;
	trackHistory.push(currentTrack);
	let nextSong: Song;
	if (userQueue.length > 0) nextSong = userQueue.shift()!;
	else if (nextFromAlbum.length > 0) {
		userQueue.push(nextFromAlbum.shift()!);
		nextSong = userQueue.shift()!;
	} else if (repeatMode === 'queue' && _savedNextFromOrder.length > 0) {
		nextFromAlbum.push(..._savedNextFromOrder);
		if (shuffleMode) shuffleNextFrom();
		userQueue.push(nextFromAlbum.shift()!);
		nextSong = userQueue.shift()!;
	} else if (nextUp.length > 0) {
		nextSong = nextUp.shift()!;
		refillNextUp();
	} else {
		playing = false;
		return;
	}

	if (audioElement) {
		audioElement.pause();
		audioElement.src = '';
	}

	currentTrack = nextSong;
	toastMessage = null;
	_pendingRestoreTime = null;
	_restoreInProgress = false;

	if (audioElement) {
		audioElement.src = getStreamUrl(currentTrack.id);
		audioElement.play().catch(() => {
			if (gen !== _playGen) return;
			toastMessage = 'Unable to play track';
			stop();
		});
	}
	saveState();
}

export async function prevTrack() {
	const gen = ++_playGen;
	if (currentTrack && currentTime >= 1.5) {
		seek(0);
		return;
	}
	if (trackHistory.length === 0) return;
	if (currentTrack) nextFromAlbum.unshift(currentTrack);
	const prevSong = trackHistory.pop()!;

	if (audioElement) {
		audioElement.pause();
		audioElement.src = '';
	}

	currentTrack = prevSong;
	toastMessage = null;
	_pendingRestoreTime = null;
	_restoreInProgress = false;

	if (audioElement) {
		audioElement.src = getStreamUrl(currentTrack.id);
		audioElement.play().catch(() => {
			if (gen !== _playGen) return;
			toastMessage = 'Unable to play track';
			stop();
		});
	}
	saveState();
}

export function seek(time: number) {
	if (audioElement) audioElement.currentTime = time;
}
export function onTrackEnded() {
	if (repeatMode === 'track') {
		seek(0);
		if (audioElement) audioElement.play().catch(() => {});
		return;
	}
	nextTrack();
}
