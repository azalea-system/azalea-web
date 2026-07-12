<script lang="ts">
	import { getServerUrl, getServerAuth } from '$lib/stores/settings.svelte';
	import { getCurrentTrack, isPlaying } from '$lib/stores/player.svelte';

	let ws: WebSocket | null = $state(null);
	let reconnectTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let pingTimer: ReturnType<typeof setInterval> | null = $state(null);
	let startTime: number | null = $state(null);
	let lastTrackId: string | null = $state(null);
	let connected = $state(false);

	function getWsUrl(): string {
		const base = getServerUrl().replace(/^http/, 'ws');
		const url = new URL(`${base}/nowplaying`);
		const auth = getServerAuth();
		if (auth?.username) {
			url.searchParams.set('u', auth.username);
			url.searchParams.set('p', auth.password);
		}
		return url.toString();
	}

	function connect() {
		if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
			return;
		}

		try {
			ws = new WebSocket(getWsUrl());

			ws.onopen = () => {
				connected = true;
			};

			ws.onclose = () => {
				connected = false;
				stopPingTimer();
				lastTrackId = null;
				startTime = null;
				scheduleReconnect();
			};

			ws.onerror = () => {
				ws?.close();
			};
		} catch {
			scheduleReconnect();
		}
	}

	function scheduleReconnect() {
		if (reconnectTimer) return;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, 5000);
	}

	function sendJson(data: Record<string, unknown>) {
		if (!ws || ws.readyState !== WebSocket.OPEN) return;
		ws.send(JSON.stringify(data));
	}

	function sendNowplaying() {
		const track = getCurrentTrack();
		if (!track) return;
		const ts = startTime ?? Date.now();
		if (startTime === null) startTime = ts;
		sendJson({
			type: 'nowplaying',
			songId: track.id,
			title: track.title,
			artist: track.artist,
			album: track.album,
			coverArt: track.coverArt,
			albumId: track.album_id,
			startTime: ts,
			duration: track.duration
		});
		startPingTimer();
	}

	function sendPing() {
		sendJson({ type: 'ping' });
	}

	function sendStopped() {
		sendJson({ type: 'stopped' });
		stopPingTimer();
	}

	function startPingTimer() {
		if (pingTimer) return;
		pingTimer = setInterval(() => {
			if (isPlaying()) {
				sendPing();
			} else {
				stopPingTimer();
			}
		}, 5000);
	}

	function stopPingTimer() {
		if (pingTimer) {
			clearInterval(pingTimer);
			pingTimer = null;
		}
	}

	$effect(() => {
		const track = getCurrentTrack();
		const playing = isPlaying();
		const trackId = track?.id ?? null;

		if (!connected) {
			connect();
			return;
		}

		if (playing && track) {
			if (trackId !== lastTrackId) {
				startTime = Date.now();
				lastTrackId = trackId;
				sendNowplaying();
			} else if (startTime === null) {
				startTime = Date.now();
				sendNowplaying();
			}
		} else if (lastTrackId !== null) {
			lastTrackId = null;
			startTime = null;
			sendStopped();
		}
	});
</script>
