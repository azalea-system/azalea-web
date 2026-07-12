const CACHE_PREFIX = 'azalea_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; 

interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

export function getCached<T>(key: string): T | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CACHE_PREFIX + key);
		if (!raw) return null;
		const entry: CacheEntry<T> = JSON.parse(raw);
		if (Date.now() - entry.timestamp > entry.ttl) {
			localStorage.removeItem(CACHE_PREFIX + key);
			return null;
		}
		return entry.data;
	} catch {
		return null;
	}
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL) {
	if (typeof window === 'undefined') return;
	try {
		const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
		localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
	} catch {
		
	}
}

export function clearCache(key?: string) {
	if (typeof window === 'undefined') return;
	if (key) {
		localStorage.removeItem(CACHE_PREFIX + key);
	} else {
		const keys = [];
		for (let i = 0; i < localStorage.length; i++) {
			const k = localStorage.key(i);
			if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
		}
		keys.forEach((k) => localStorage.removeItem(k));
	}
}

export async function withCache<T>(
	key: string,
	fetchFn: () => Promise<T>,
	ttl: number = DEFAULT_TTL,
	enabled: boolean = true
): Promise<{ data: T; cached: boolean }> {
	if (!enabled) {
		const data = await fetchFn();
		return { data, cached: false };
	}
	const cached = getCached<T>(key);
	if (cached !== null) {
		return { data: cached, cached: true };
	}
	const data = await fetchFn();
	setCache(key, data, ttl);
	return { data, cached: false };
}
