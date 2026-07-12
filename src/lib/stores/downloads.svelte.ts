export interface DownloadInfo {
	songId: string;
	status: 'starting' | 'downloading' | 'completed' | 'failed';
	progress: number;
	speed?: string;
	eta?: string;
	path?: string;
}

let _downloads = $state<Record<string, DownloadInfo>>({});

export function getDownloads() {
	return _downloads;
}

export function getDownload(songId: string): DownloadInfo | null {
	return _downloads[songId] ?? null;
}

export function updateDownload(info: DownloadInfo) {
	_downloads[info.songId] = info;
}

export function isDownloading(songId: string): boolean {
	const d = _downloads[songId];
	return d?.status === 'downloading' || d?.status === 'starting';
}

export function isDownloaded(songId: string): boolean {
	const d = _downloads[songId];
	return d?.status === 'completed';
}
