const TRAILING_SLASH_PATTERN = /\/+$/;
const HTML_HEADING_PATTERN = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
const HTML_PARAGRAPH_OPEN_PATTERN = /<p\b[^>]*>/gi;
const HTML_PARAGRAPH_CLOSE_PATTERN = /<\/p>/gi;
const HTML_BREAK_PATTERN = /<br\s*\/?>/gi;
const HTML_LIST_ITEM_OPEN_PATTERN = /<li\b[^>]*>/gi;
const HTML_LIST_ITEM_CLOSE_PATTERN = /<\/li>/gi;
const HTML_BLOCK_CLOSE_PATTERN = /<\/(?:div|section|article|ul|ol|blockquote)>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const MULTIPLE_BLANK_LINES_PATTERN = /\n{3,}/g;
const HORIZONTAL_WHITESPACE_PATTERN = /[ \t]+/g;
const NBSP_ENTITY_PATTERN = /&nbsp;/gi;
const AMP_ENTITY_PATTERN = /&amp;/gi;
const QUOTE_ENTITY_PATTERN = /&quot;/gi;
const APOSTROPHE_ENTITY_PATTERN = /(?:&#39;|&apos;)/gi;
const LT_ENTITY_PATTERN = /&lt;/gi;
const GT_ENTITY_PATTERN = /&gt;/gi;
const DECIMAL_ENTITY_PATTERN = /&#(\d+);/g;
const HEX_ENTITY_PATTERN = /&#x([0-9a-f]+);/gi;

interface MarkdownResponseOptions {
	status?: number;
	headers?: HeadersInit;
}

interface AcceptPreference {
	media: string;
	q: number;
}

export function createMarkdownResponse(
	body: string,
	options: MarkdownResponseOptions = {},
): Response {
	const headers = new Headers(options.headers);
	headers.set("Content-Type", "text/markdown; charset=utf-8");
	headers.set("Cache-Control", headers.get("Cache-Control") ?? "public, max-age=3600");

	return new Response(body, {
		status: options.status ?? 200,
		headers,
	});
}

export function markdownAlternatePathForPathname(pathname: string): string | null {
	const normalizedPathname = pathname === "/" ? "/" : pathname.replace(TRAILING_SLASH_PATTERN, "");

	if (normalizedPathname.endsWith(".md")) return null;
	if (normalizedPathname === "/") return "/index.md";
	if (normalizedPathname === "/categories") return "/categories.md";
	if (normalizedPathname === "/blog") return "/blog.md";
	if (normalizedPathname === "/tools") return "/tools.md";

	for (const prefix of ["/item/", "/category/", "/blog/", "/tools/"]) {
		if (normalizedPathname.startsWith(prefix) && normalizedPathname.length > prefix.length) {
			return `${normalizedPathname}.md`;
		}
	}

	return null;
}

export function buildMarkdownAlternateLink(pathname: string): string | null {
	const alternatePath = markdownAlternatePathForPathname(pathname);
	if (!alternatePath) return null;
	return `<${alternatePath}>; rel="alternate"; type="text/markdown"`;
}

export function prefersMarkdown(acceptHeader: string | null): boolean {
	if (!acceptHeader) return false;

	const preferences = parseAcceptHeader(acceptHeader);
	const markdownQ = bestExplicitTextQ(preferences, "text/markdown");
	const htmlQ = bestQ(preferences, "text/html");

	return markdownQ > 0 && markdownQ >= htmlQ;
}

export function appendVary(headers: Headers, value: string): void {
	const existing = headers.get("Vary");
	if (!existing) {
		headers.set("Vary", value);
		return;
	}

	const existingValues = existing.split(",").map((item) => item.trim().toLowerCase());
	if (!existingValues.includes(value.toLowerCase())) {
		headers.set("Vary", `${existing}, ${value}`);
	}
}

export function htmlToMarkdown(html: string | null | undefined): string {
	if (!html) return "";

	return decodeHtmlEntities(
		html
			.replace(HTML_HEADING_PATTERN, (_match, level: string, content: string) => {
				const depth = Math.min(Math.max(Number.parseInt(level, 10), 1), 6);
				return `\n\n${"#".repeat(depth)} ${stripHtml(content)}\n\n`;
			})
			.replace(HTML_PARAGRAPH_OPEN_PATTERN, "\n\n")
			.replace(HTML_PARAGRAPH_CLOSE_PATTERN, "\n\n")
			.replace(HTML_BREAK_PATTERN, "\n")
			.replace(HTML_LIST_ITEM_OPEN_PATTERN, "\n- ")
			.replace(HTML_LIST_ITEM_CLOSE_PATTERN, "\n")
			.replace(HTML_BLOCK_CLOSE_PATTERN, "\n\n")
			.replace(HTML_TAG_PATTERN, "")
			.replace(HORIZONTAL_WHITESPACE_PATTERN, " ")
			.replace(MULTIPLE_BLANK_LINES_PATTERN, "\n\n")
			.trim(),
	);
}

export function stripHtml(value: string): string {
	return decodeHtmlEntities(value.replace(HTML_TAG_PATTERN, "").trim());
}

export function markdownList(items: Array<string | null | undefined>): string {
	return items
		.map((item) => item?.trim())
		.filter((item): item is string => Boolean(item))
		.map((item) => `- ${item}`)
		.join("\n");
}

export function absoluteMarkdownLink(origin: string, path: string, label: string): string {
	return `[${label}](${new URL(path, origin).href})`;
}

function parseAcceptHeader(header: string): AcceptPreference[] {
	return header
		.split(",")
		.map((part) => {
			const [mediaType, ...parameters] = part
				.trim()
				.split(";")
				.map((value) => value.trim());
			const qParameter = parameters.find((parameter) => parameter.startsWith("q="));
			const q = qParameter ? Number.parseFloat(qParameter.slice(2)) : 1;

			return {
				media: mediaType.toLowerCase(),
				q: Number.isFinite(q) ? q : 0,
			};
		})
		.filter((preference) => preference.media.length > 0);
}

function bestQ(preferences: AcceptPreference[], media: string): number {
	const [type] = media.split("/");
	const candidates = new Set([media, `${type}/*`, "*/*"]);

	return preferences.reduce((best, preference) => {
		return candidates.has(preference.media) ? Math.max(best, preference.q) : best;
	}, 0);
}

function bestExplicitTextQ(preferences: AcceptPreference[], media: string): number {
	const [type] = media.split("/");
	const candidates = new Set([media, `${type}/*`]);

	return preferences.reduce((best, preference) => {
		return candidates.has(preference.media) ? Math.max(best, preference.q) : best;
	}, 0);
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(NBSP_ENTITY_PATTERN, " ")
		.replace(AMP_ENTITY_PATTERN, "&")
		.replace(QUOTE_ENTITY_PATTERN, '"')
		.replace(APOSTROPHE_ENTITY_PATTERN, "'")
		.replace(LT_ENTITY_PATTERN, "<")
		.replace(GT_ENTITY_PATTERN, ">")
		.replace(DECIMAL_ENTITY_PATTERN, (_match, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		)
		.replace(HEX_ENTITY_PATTERN, (_match, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		);
}
