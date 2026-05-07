import {
	getLegacyBlogRedirectPath,
	resolveCategoryHref,
	resolveItemHref,
} from "./legacy-routes.js";

const HREF_ATTRIBUTE_PATTERN = /\bhref=(["'])([^"']+)\1/g;
const ROUTE_PATH_PATTERN = /^\/(item|category|blog|tools)\/([^/]+)$/;
const TRAILING_SLASH_PATTERN = /\/+$/;
const SITE_BASE_URL = "https://www.ttrpg-games.com";

type NormalizeInternalHtmlLinksOptions = {
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

export function normalizeInternalHtmlLinks(
	html: string | null | undefined,
	options: NormalizeInternalHtmlLinksOptions = {},
): string | null {
	if (!html) return null;

	return html.replace(HREF_ATTRIBUTE_PATTERN, (attribute, quote: string, href: string) => {
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

		if (url.origin !== SITE_BASE_URL && !isRelativeHref(href)) return attribute;

		const normalizedPath = normalizePath(url.pathname, options.toolSlugs);
		if (normalizedPath === url.pathname && !url.pathname.endsWith("/")) return attribute;

		const nextHref =
			(isRelativeHref(href) ? "" : url.origin) + normalizedPath + url.search + url.hash;
		if (nextHref === href) return attribute;
		return `href=${quote}${nextHref}${quote}`;
	});
}
