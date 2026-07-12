import { getCurrentTrack } from './player.svelte';
import { getCoverArtUrl } from '$lib/api';
import { isGradientsEnabled } from './settings.svelte';

let _gradient = $state('');

const _paletteCache = new Map<string, any>();

function _hexToRgba(hex: string, alpha: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha})`;
}

export async function updateGradients() {
	const track = getCurrentTrack();
	const coverArt = track?.coverArt ?? null;
	if (!coverArt) {
		_gradient = '';
		return;
	}

	try {
		let palette = _paletteCache.get(coverArt);
		if (!palette) {
			const { Vibrant } = await import('node-vibrant/browser');
			const url = getCoverArtUrl(coverArt, 128);
			palette = await Vibrant.from(url).getPalette();
			if (_paletteCache.size > 20) _paletteCache.clear();
			_paletteCache.set(coverArt, palette);
		}

		const dv = palette.DarkVibrant?.hex;
		const dm = palette.DarkMuted?.hex;

		if (dv || dm) {
			_gradient = `linear-gradient(to right,${_hexToRgba(dv || dm, 0.3)} 0%,transparent 70%)`;
		} else {
			_gradient = '';
		}
	} catch {
		_gradient = '';
	}
}

export function getGradient() {
	return _gradient;
}
