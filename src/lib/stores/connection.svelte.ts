let _connected = $state(true);
let _error = $state<string | null>(null);
let _checking = $state(false);

export function getConnectionState() {
	return { connected: _connected, error: _error, checking: _checking };
}

export function setConnected(v: boolean) {
	_connected = v;
	if (v) _error = null;
}

export function setError(msg: string) {
	_connected = false;
	_error = msg;
}

export function setChecking(v: boolean) {
	_checking = v;
}
