export const SITE_DEFAULT_OG_IMAGE_PATH = "/images/logo-brown-transparent.png";

interface ResolvePageMetaOptions {
	url: URL;
	canonical?: string | null;
	image?: string | null;
}

interface ResolvedPageMeta {
	canonical: string;
	image: string;
}

function normalizeCanonicalUrl(value: string): string {
	const normalized = new URL(value);

	if (normalized.pathname === "/" && !normalized.search && !normalized.hash) {
		return normalized.origin;
	}

	return normalized.href;
}

function toAbsoluteUrl(value: string, url: URL): string {
	return new URL(value, url).href;
}

export function resolvePageMeta({
	url,
	canonical,
	image,
}: ResolvePageMetaOptions): ResolvedPageMeta {
	return {
		canonical: normalizeCanonicalUrl(toAbsoluteUrl(canonical || url.href, url)),
		image: toAbsoluteUrl(image || SITE_DEFAULT_OG_IMAGE_PATH, url),
	};
}
