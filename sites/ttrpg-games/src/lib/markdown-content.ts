import { absoluteMarkdownLink, htmlToMarkdown, markdownList } from "./markdown.js";
import type { CategoryPageEntry, GameEntry, PostEntry } from "./types.js";

interface PortableTextSpan {
	text?: string;
}

interface PortableTextBlock {
	style?: string;
	listItem?: string;
	children?: PortableTextSpan[];
}

const LEADING_H1_PATTERN = /^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i;

export function compactMarkdown(parts: Array<string | null | undefined>): string {
	return `${parts
		.map((part) => part?.trim())
		.filter(Boolean)
		.join("\n\n")}\n`;
}

export function formatMarkdownDate(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;

	return parsed.toISOString().slice(0, 10);
}

export function gameSummaryLine(origin: string, game: GameEntry): string {
	const blurb = game.data.blurb || game.data.review_summary || "";
	const rank = game.data.rank ? `Rank #${game.data.rank}. ` : "";
	const summary = `${rank}${blurb}`.trim();
	const link = absoluteMarkdownLink(origin, `/item/${game.id}`, game.data.title);
	return summary ? `${link} - ${summary}` : link;
}

export function categorySummaryLine(origin: string, category: CategoryPageEntry): string {
	const link = absoluteMarkdownLink(origin, `/category/${category.id}`, category.data.title);
	return category.data.description ? `${link} - ${category.data.description}` : link;
}

export function postSummaryLine(origin: string, post: PostEntry, path: string): string {
	const date = formatMarkdownDate(post.data.publishedAt);
	const summary = [date, post.data.excerpt].filter(Boolean).join(" - ");
	const link = absoluteMarkdownLink(origin, path, post.data.title);
	return summary ? `${link} - ${summary}` : link;
}

export function postBodyMarkdown(post: PostEntry): string {
	const bodyHtml = post.data.body_html?.replace(LEADING_H1_PATTERN, "").trim();
	if (bodyHtml) return htmlToMarkdown(bodyHtml);
	return portableTextMarkdown(post.data.content);
}

export function portableTextMarkdown(value: unknown): string {
	if (!Array.isArray(value)) return "";

	const lines = value
		.map((block) => {
			if (!isPortableTextBlock(block)) return null;
			const text = block.children
				?.map((child) => child.text ?? "")
				.join("")
				.trim();
			if (!text) return null;

			if (block.listItem) return `- ${text}`;
			if (block.style?.startsWith("h")) {
				const level = Number.parseInt(block.style.slice(1), 10);
				const depth = Number.isFinite(level) ? Math.min(Math.max(level, 1), 6) : 2;
				return `${"#".repeat(depth)} ${text}`;
			}
			return text;
		})
		.filter((line): line is string => Boolean(line));

	return lines.join("\n\n");
}

export function section(title: string, body: string | null | undefined): string | null {
	const trimmed = body?.trim();
	if (!trimmed) return null;
	return `## ${title}\n\n${trimmed}`;
}

export function listSection(title: string, items: Array<string | null | undefined>): string | null {
	const body = markdownList(items);
	return section(title, body);
}

function isPortableTextBlock(value: unknown): value is PortableTextBlock {
	return typeof value === "object" && value !== null;
}
