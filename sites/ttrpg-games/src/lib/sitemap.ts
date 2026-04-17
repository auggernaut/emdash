const SQLITE_DATETIME_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?$/;
const ISO_WITHOUT_ZONE_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?$/;
const DATE_PREFIX_PATTERN = /^(\d{4}-\d{2}-\d{2})/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeSitemapLastmod(value: string): string {
	const trimmed = value.trim();

	if (!trimmed) {
		return new Date().toISOString();
	}

	if (DATE_ONLY_PATTERN.test(trimmed)) {
		return trimmed;
	}

	const sqliteMatch = trimmed.match(SQLITE_DATETIME_PATTERN);
	const isoWithoutZoneMatch = trimmed.match(ISO_WITHOUT_ZONE_PATTERN);
	const candidate = sqliteMatch
		? `${sqliteMatch[1]}T${sqliteMatch[2]}${sqliteMatch[3] ?? ""}Z`
		: isoWithoutZoneMatch
			? `${trimmed}Z`
			: trimmed;

	const parsed = new Date(candidate);
	if (!Number.isNaN(parsed.getTime())) {
		return parsed.toISOString();
	}

	const datePrefix = trimmed.match(DATE_PREFIX_PATTERN);
	if (datePrefix) {
		return datePrefix[1];
	}

	return new Date().toISOString();
}

export function latestSitemapLastmod(values: string[]): string {
	const timestamps = values
		.map((value) => Date.parse(normalizeSitemapLastmod(value)))
		.filter((value) => Number.isFinite(value));

	if (timestamps.length === 0) {
		return new Date().toISOString();
	}

	return new Date(Math.max(...timestamps)).toISOString();
}
