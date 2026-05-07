import {
	getLegacyBlogRedirectPath,
	resolveCategoryHref,
	resolveItemHref,
} from "./legacy-routes.js";

const HREF_ATTRIBUTE_PATTERN = /\bhref=(["'])([^"']+)\1/g;
const IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
const IMG_ALT_ATTRIBUTE_PATTERN = /\salt=(["'])(.*?)\1/i;
const IMG_TAG_END_PATTERN = />$/;
const ROUTE_PATH_PATTERN = /^\/(item|category|blog|tools)\/([^/]+)$/;
const TRAILING_SLASH_PATTERN = /\/+$/;
const AMPERSAND_PATTERN = /&/g;
const DOUBLE_QUOTE_PATTERN = /"/g;
const SITE_BASE_URL = "https://www.ttrpg-games.com";
const INTERNAL_ORIGINS = new Set([SITE_BASE_URL, "https://ttrpg-games.com"]);

type NormalizeInternalHtmlLinksOptions = {
	imageAlt?: string;
	toolSlugs?: ReadonlySet<string>;
};

function isRelativeHref(href: string): boolean {
	return href.startsWith("/") && !href.startsWith("//");
}

function normalizePath(pathname: string, toolSlugs?: ReadonlySet<string>): string {
	const normalizedPathname =
		pathname.length > 1 ? pathname.replace(TRAILING_SLASH_PATTERN, "") : pathname;
	const [, section, slug] = ROUTE_PATH_PATTERN.exec(normalizedPathname) ?? [];

	if (!section || !slug) return normalizedPathname;

	const decodedSlug = decodeURIComponent(slug);
	if (section === "item") return resolveItemHref(decodedSlug);
	if (section === "category") return resolveCategoryHref(decodedSlug);
	if (section === "blog") {
		const legacyPath = getLegacyBlogRedirectPath(decodedSlug);
		if (legacyPath) return legacyPath;
		if (toolSlugs?.has(decodedSlug)) return `/tools/${encodeURIComponent(decodedSlug)}`;
		return `/blog/${encodeURIComponent(decodedSlug)}`;
	}
	if (section === "tools") return `/tools/${encodeURIComponent(decodedSlug)}`;

	return normalizedPathname;
}

function escapeAttribute(value: string): string {
	return value.replace(AMPERSAND_PATTERN, "&amp;").replace(DOUBLE_QUOTE_PATTERN, "&quot;");
}

function normalizeImageAltAttributes(html: string, fallbackAlt?: string): string {
	if (!fallbackAlt) return html;

	const escapedAlt = escapeAttribute(fallbackAlt);
	return html.replace(IMG_TAG_PATTERN, (tag) => {
		const altMatch = IMG_ALT_ATTRIBUTE_PATTERN.exec(tag);
		if (!altMatch) {
			return tag.replace(IMG_TAG_END_PATTERN, ` alt="${escapedAlt}">`);
		}

		if (altMatch[2]?.trim()) return tag;
		return tag.replace(IMG_ALT_ATTRIBUTE_PATTERN, ` alt="${escapedAlt}"`);
	});
}

export function normalizeInternalHtmlLinks(
	html: string | null | undefined,
	options: NormalizeInternalHtmlLinksOptions = {},
): string | null {
	if (!html) return null;

	const normalizedLinks = html.replace(HREF_ATTRIBUTE_PATTERN, (attribute, quote: string, href: string) => {
		if (
			href.startsWith("#") ||
			href.startsWith("mailto:") ||
			href.startsWith("tel:") ||
			href.startsWith("javascript:")
		) {
			return attribute;
		}

		let url: URL;
		try {
			url = new URL(href, SITE_BASE_URL);
		} catch {
			return attribute;
		}

		if (!INTERNAL_ORIGINS.has(url.origin) && !isRelativeHref(href)) return attribute;

		const normalizedPath = normalizePath(url.pathname, options.toolSlugs);
		if (normalizedPath === url.pathname && !url.pathname.endsWith("/")) return attribute;

		const nextHref = normalizedPath + url.search + url.hash;
		if (nextHref === href) return attribute;
		return `href=${quote}${nextHref}${quote}`;
	});

	return normalizeImageAltAttributes(normalizedLinks, options.imageAlt);
}
