type InvalidationCache = {
	enabled: boolean;
	invalidate: (options: { tags: string[] }) => Promise<void>;
};

export async function invalidateCacheTags(
	cache: InvalidationCache,
	tags: string[],
	context: string,
): Promise<void> {
	if (!cache.enabled || tags.length === 0) {
		return;
	}

	try {
		await cache.invalidate({ tags });
	} catch (error) {
		console.warn(`[CACHE_INVALIDATE_FAILED] ${context}`, error);
	}
}
