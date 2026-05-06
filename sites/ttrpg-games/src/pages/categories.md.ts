import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

import { categorySummaryLine, compactMarkdown, listSection } from "../lib/markdown-content.js";
import { createMarkdownResponse } from "../lib/markdown.js";
import type { CategoryPageEntry } from "../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const { entries } = await getEmDashCollection("category_pages");
	const categories = (entries as unknown as CategoryPageEntry[]).toSorted((left, right) => {
		if (left.data.type !== right.data.type) return left.data.type.localeCompare(right.data.type);
		return left.data.title.localeCompare(right.data.title);
	});

	return createMarkdownResponse(
		compactMarkdown([
			"# TTRPG Categories",
			"Browse tabletop RPG categories by genre, mechanics, format, tone, and decision criteria.",
			listSection(
				"Categories",
				categories.map((category) => categorySummaryLine(url.origin, category)),
			),
		]),
	);
};
