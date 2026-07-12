function load<T>(key: string, fallback: T, parse: (s: string) => T): T {
	if (typeof localStorage !== 'undefined') {
		const v = localStorage.getItem(key);
		if (v !== null) return parse(v);
	}
	return fallback;
}

let queueSidebarWidth = $state(load('queueSidebarWidth', 300, parseInt));
let queueSidebarCollapsed = $state(load('queueSidebarCollapsed', false, (s) => s === 'true'));

export function getQueueSidebarWidth() {
	return queueSidebarWidth;
}
export function setQueueSidebarWidth(w: number) {
	queueSidebarWidth = w;
	localStorage.setItem('queueSidebarWidth', String(w));
}
export function getQueueSidebarCollapsed() {
	return queueSidebarCollapsed;
}
export function setQueueSidebarCollapsed(c: boolean) {
	queueSidebarCollapsed = c;
	localStorage.setItem('queueSidebarCollapsed', String(c));
}
export function getEffectiveSidebarWidth() {
	return queueSidebarCollapsed ? 32 : queueSidebarWidth;
}
