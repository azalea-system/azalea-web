export type UpdatePhase = 'idle' | 'downloading' | 'completed' | 'failed' | 'aborted';

export interface UpdateStatus {
	phase: UpdatePhase;
	version?: string;
	message?: string;
}

const STORAGE_KEY = 'azalea_update_status';

function loadPersisted(): UpdateStatus {
	if (typeof window === 'undefined') return { phase: 'idle' };
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v) return JSON.parse(v) as UpdateStatus;
	} catch {}
	return { phase: 'idle' };
}

function persist(status: UpdateStatus) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
	} catch {}
}

let _status = $state<UpdateStatus>(loadPersisted());

export function getUpdateStatus() {
	return _status;
}

export function setUpdateStatus(status: UpdateStatus) {
	_status = status;
	persist(status);
}

export function resetUpdateStatus() {
	const s: UpdateStatus = { phase: 'idle' };
	_status = s;
	persist(s);
}