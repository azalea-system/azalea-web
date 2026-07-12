<script lang="ts">
	import { getServerUrl, getServerAuth } from '$lib/stores/settings.svelte';
	import { setUpdateStatus, resetUpdateStatus, getUpdateStatus } from '$lib/stores/update.svelte';
	import { toast } from 'svelte-sonner';

	let ws: WebSocket | null = $state(null);
	let reconnectTimer: ReturnType<typeof setTimeout> | null = $state(null);
	let shownCompletion = $state(false);
	let shownFailure = $state(false);

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
		const status = getUpdateStatus();
		if (status.phase === 'completed' || status.phase === 'failed' || status.phase === 'aborted') return;
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
					if (msg.type === 'update_status') {
						const phase = msg.status;
						const version = msg.version;
						const message = msg.message;
						setUpdateStatus({ phase, version, message });
						if (phase === 'completed' && !shownCompletion) {
							shownCompletion = true;
							toast.success('Update complete', {
								description: message || `Azalea ${version} has been downloaded.`
							});
						}
						if (phase === 'failed' && !shownFailure) {
							shownFailure = true;
							const isHttpError = message?.startsWith('Download failed: update server returned HTTP');
							const isNetworkError = message?.startsWith('Download failed:') && !message?.includes('HTTP');
							if (isHttpError) {
								toast.error('Download failed', {
									description: message || 'The update server returned an unexpected response.'
								});
							} else if (isNetworkError) {
								toast.error('Network error', {
									description: message || 'Could not reach the update server.'
								});
							} else {
								toast.error('Update failed', {
									description: message || 'An error occurred during the update.'
								});
							}
						}
					}
				} catch {}
			};
		} catch {
			scheduleReconnect();
		}
	}

	function scheduleReconnect() {
		const status = getUpdateStatus();
		if (status.phase === 'completed' || status.phase === 'failed' || status.phase === 'aborted') return;
		if (reconnectTimer) return;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, 5000);
	}

	$effect(() => {
		const status = getUpdateStatus();
		if (status.phase === 'idle') {
			shownCompletion = false;
			shownFailure = false;
		} else if (status.phase === 'completed') {
			shownCompletion = true;
		} else if (status.phase === 'failed') {
			shownFailure = true;
		}
		if (status.phase !== 'completed' && status.phase !== 'failed' && status.phase !== 'aborted') {
			connect();
		}
		return () => {
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (ws) ws.close();
		};
	});
</script>
