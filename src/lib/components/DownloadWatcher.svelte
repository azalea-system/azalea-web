<script lang="ts">
	import { getServerUrl, getServerAuth } from '$lib/stores/settings.svelte';
	import { updateDownload } from '$lib/stores/downloads.svelte';

	let ws: WebSocket | null = $state(null);
	let reconnectTimer: ReturnType<typeof setTimeout> | null = $state(null);

	function getWsUrl(): string {
		const base = getServerUrl().replace(/^http/, 'ws');
		const url = new URL(`${base}/rest/downloadEvents`);
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
			ws.onopen = () => {};
			ws.onclose = () => {
				scheduleReconnect();
			};
			ws.onerror = () => {
				ws?.close();
			};
			ws.onmessage = (event) => {
				try {
					const msg = JSON.parse(event.data);
					if (msg.type === 'download_status') {
						updateDownload({
							songId: msg.song_id,
							status: msg.status,
							progress: msg.progress ?? 0,
							speed: msg.speed,
							eta: msg.eta,
							path: msg.path
						});
					}
				} catch {}
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

	$effect(() => {
		connect();
		return () => {
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (ws) ws.close();
		};
	});
</script>
