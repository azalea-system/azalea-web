const STORAGE_KEY = 'azalea_search_history';
const MAX_ITEMS = 20;

export function getSearchHistory(): string[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

export function addSearchHistory(query: string) {
	const trimmed = query.trim();
	if (!trimmed || typeof window === 'undefined') return;
	const history = getSearchHistory().filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
	history.unshift(trimmed);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
}

export function removeSearchHistory(query: string) {
	if (typeof window === 'undefined') return;
	const history = getSearchHistory().filter((item) => item !== query);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}
