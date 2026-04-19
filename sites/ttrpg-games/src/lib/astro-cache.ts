type AstroCacheAccessor<T> = {
	enabled: boolean;
	set: (cacheHint: T) => void;
};

export function setAstroCacheHint<T>(
	cache: AstroCacheAccessor<T>,
	cacheHint: T | null | undefined,
): void {
	if (cache.enabled && cacheHint) {
		cache.set(cacheHint);
	}
}
