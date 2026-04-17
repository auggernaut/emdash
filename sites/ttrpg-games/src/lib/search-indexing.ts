const TRAILING_SLASH_PATTERN = /\/+$/;

export function shouldBlockSearchIndexing(hostname: string): boolean {
	return hostname === "workers.dev" || hostname.endsWith(".workers.dev");
}

export function buildRobotsTxt(origin: string, hostname: string): string {
	if (shouldBlockSearchIndexing(hostname)) {
		return ["User-agent: *", "Disallow: /"].join("\n");
	}

	const normalizedOrigin = origin.replace(TRAILING_SLASH_PATTERN, "");

	return [
		"User-agent: *",
		"Allow: /",
		"",
		"# Disallow admin and API routes",
		"Disallow: /_emdash/",
		"",
		`Sitemap: ${normalizedOrigin}/sitemap.xml`,
	].join("\n");
}
