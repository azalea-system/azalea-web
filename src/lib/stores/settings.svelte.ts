function loadSetting<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;
	try {
		const v = localStorage.getItem(key);
		return v !== null ? (JSON.parse(v) as T) : fallback;
	} catch {
		return fallback;
	}
}

function saveSetting<T>(key: string, value: T) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

export const appName = 'Azalea';
export const version = '1.3a';
export const titleEnding = ` - ${appName}`;
let _serverUrl = $state(loadSetting('serverUrl', 'http://localhost:3443'));
let _proxyEnabled = $state(loadSetting('proxyEnabled', false));
let _accentColor = $state(loadSetting('accentColor', '#3b82f6'));
let _mediaSessionEnabled = $state(loadSetting('mediaSessionEnabled', true));
let _randomQueueSize = $state(loadSetting('randomQueueSize', 10));
let _endlessQueueEnabled = $state(loadSetting('endlessQueueEnabled', true));
let _serverAuth = $state(loadSetting('serverAuth', { username: 'admin', password: 'admin' }));
let _roundedAlbumCovers = $state(loadSetting('roundedAlbumCovers', true));
let _roundedUiElements = $state(loadSetting('roundedUiElements', true));
let _artistImageDisplay = $state(loadSetting('artistImageDisplay', 'circle'));
let _fontFamily = $state(loadSetting('fontFamily', ''));
let _cacheEnabled = $state(loadSetting('cacheEnabled', true));
let _autoplayOnLoadEnabled = $state(loadSetting('autoplayOnLoadEnabled', true));
let _favouriteSongStyle = $state(loadSetting('favouriteSongStyle', 'star'));
let _gradientsEnabled = $state(loadSetting('gradientsEnabled', true));
let _albumPageActionButtonsStyle;

function setProxyUrlCookie(url: string) {
	if (typeof document === 'undefined') return;
	document.cookie = `azalea-server-url=${encodeURIComponent(url)}; path=/; max-age=31536000; SameSite=Lax`;
}

export function getServerUrl() {
	return _serverUrl;
}
export function setServerUrl(v: string) {
	_serverUrl = v;
	saveSetting('serverUrl', v);
	setProxyUrlCookie(v);
}

export function isProxyEnabled() {
	return _proxyEnabled;
}
export function setProxyEnabled(v: boolean) {
	_proxyEnabled = v;
	saveSetting('proxyEnabled', v);
}

export function getAccentColor() {
	return _accentColor;
}
export function setAccentColor(v: string) {
	_accentColor = v;
	saveSetting('accentColor', v);
	applyAccentColor(v);
}

export function isMediaSessionEnabled() {
	return _mediaSessionEnabled;
}
export function setMediaSessionEnabled(v: boolean) {
	_mediaSessionEnabled = v;
	saveSetting('mediaSessionEnabled', v);
}

export function getRandomQueueSize() {
	return _randomQueueSize;
}
export function setRandomQueueSize(v: number) {
	_randomQueueSize = v;
	saveSetting('randomQueueSize', v);
}

export function isEndlessQueueEnabled() {
	return _endlessQueueEnabled;
}
export function setEndlessQueueEnabled(v: boolean) {
	_endlessQueueEnabled = v;
	saveSetting('endlessQueueEnabled', v);
}

export function getServerAuth() {
	return _serverAuth;
}
export function setServerAuth(obj: { username: string; password: string }) {
	_serverAuth = obj;
	saveSetting('serverAuth', obj);
}

export function applyAccentColor(color: string) {
	if (typeof document === 'undefined') return;
	document.documentElement.style.setProperty('--accent', color);
}

export function getRoundedAlbumCovers() {
	return _roundedAlbumCovers;
}
export function setRoundedAlbumCovers(v: boolean) {
	_roundedAlbumCovers = v;
	saveSetting('roundedAlbumCovers', v);
	applyAppearanceSettings();
}

export function getRoundedUiElements() {
	return _roundedUiElements;
}
export function setRoundedUiElements(v: boolean) {
	_roundedUiElements = v;
	saveSetting('roundedUiElements', v);
	applyAppearanceSettings();
}

export function getArtistImageDisplay() {
	return _artistImageDisplay;
}
export function setArtistImageDisplay(v: string) {
	_artistImageDisplay = v;
	saveSetting('artistImageDisplay', v);
	applyAppearanceSettings();
}

export function getFontFamily() {
	return _fontFamily;
}
export function setFontFamily(v: string) {
	_fontFamily = v;
	saveSetting('fontFamily', v);
	applyAppearanceSettings();
}

export function isCacheEnabled() {
	return _cacheEnabled;
}
export function setCacheEnabled(v: boolean) {
	_cacheEnabled = v;
	saveSetting('cacheEnabled', v);
}

export function isAutoplayOnLoadEnabled() {
	return _autoplayOnLoadEnabled;
}
export function setAutoplayOnLoadEnabled(v: boolean) {
	_autoplayOnLoadEnabled = v;
	saveSetting('autoplayOnLoadEnabled', v);
}

export function getFavouriteSongStyle() {
	return _favouriteSongStyle;
}
export function setFavouriteSongStyle(v: string) {
	_favouriteSongStyle = v;
	saveSetting('favouriteSongStyle', v);
}

export function isGradientsEnabled() {
	return _gradientsEnabled;
}
export function setGradientsEnabled(v: boolean) {
	_gradientsEnabled = v;
	saveSetting('gradientsEnabled', v);
}

export function getAlbumPageActionButtonsStyle() {
	return _albumPageActionButtonsStyle;
}

export function setAlbumPageActionButtonsStyle(v: string) {
	_albumPageActionButtonsStyle = v;
	saveSetting('albumPageActionButtonsStyle', v);
}

export function applyAppearanceSettings() {
	if (typeof document === 'undefined') return;
	const root = document.documentElement;
	root.style.setProperty('--radius-album', _roundedAlbumCovers ? '0.5rem' : '0');
	root.style.setProperty('--radius-ui', _roundedUiElements ? '0.5rem' : '0');
	const artistRadii: Record<string, string> = { circle: '9999px', rounded: '0.5rem', square: '0' };
	root.style.setProperty('--radius-artist', artistRadii[_artistImageDisplay] || '9999px');
	root.style.fontFamily = _fontFamily || '';
}

export function initSettings() {
	applyAccentColor(_accentColor);
	applyAppearanceSettings();
	setProxyUrlCookie(_serverUrl);
}
