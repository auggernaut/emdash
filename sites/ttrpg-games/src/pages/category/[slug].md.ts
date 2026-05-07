import type { APIRoute } from "astro";
import { getEmDashCollection, getEmDashEntry } from "emdash";

import {
	compactMarkdown,
	gameSummaryLine,
	listSection,
	section,
} from "../../lib/markdown-content.js";
import { createMarkdownResponse, htmlToMarkdown } from "../../lib/markdown.js";
import { filterGameEntries, isCategoryPageEntry } from "../../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const slug = params.slug;
	if (!slug) return createMarkdownResponse("# Category Not Found\n", { status: 404 });

	const { entry } = await getEmDashEntry("category_pages", slug);
	if (!isCategoryPageEntry(entry)) {
		return createMarkdownResponse("# Category Not Found\n", { status: 404 });
	}
	const category = entry;

	const sourceTaxonomy = category.data.source_taxonomy ?? null;
	const sourceTermSlug = category.data.source_term_slug ?? null;
	const where =
		sourceTaxonomy && sourceTermSlug
			? {
					[sourceTaxonomy]: sourceTermSlug,
				}
			: undefined;
	const { entries } = await getEmDashCollection("games", where ? { where } : undefined);
	const games = filterGameEntries(entries).toSorted((left, right) => {
		const leftRank = left.data.rank ?? Number.MAX_SAFE_INTEGER;
		const rightRank = right.data.rank ?? Number.MAX_SAFE_INTEGER;
		if (leftRank !== rightRank) return leftRank - rightRank;
		return left.data.title.localeCompare(right.data.title);
	});

	return createMarkdownResponse(
		compactMarkdown([
			`# Best ${category.data.title} TTRPGs`,
			category.data.description,
			section("Guide", htmlToMarkdown(category.data.body_html)),
			listSection(
				"Games",
				games.map((game) => gameSummaryLine(url.origin, game)),
			),
		]),
	);
};
