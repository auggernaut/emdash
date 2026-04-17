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

function toAbsoluteUrl(value: string, url: URL): string {
	return new URL(value, url).href;
}

export function resolvePageMeta({
	url,
	canonical,
	image,
}: ResolvePageMetaOptions): ResolvedPageMeta {
	return {
		canonical: toAbsoluteUrl(canonical || url.href, url),
		image: toAbsoluteUrl(image || SITE_DEFAULT_OG_IMAGE_PATH, url),
	};
}
