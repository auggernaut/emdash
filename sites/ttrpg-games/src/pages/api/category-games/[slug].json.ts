import type { APIRoute } from "astro";
import { getEmDashCollection, getEmDashEntry } from "emdash";

import type { CategoryPageEntry, GameEntry } from "../../../lib/types";

function isGameEntryArray(value: unknown): value is GameEntry[] {
	return Array.isArray(value);
}

function isCategoryPageEntry(value: unknown): value is CategoryPageEntry {
	return value !== null && typeof value === "object" && "data" in value;
}

export const GET: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) {
		return Response.json({ error: "Missing category slug." }, { status: 400 });
	}

	const { entry } = await getEmDashEntry("category_pages", slug);
	const categoryPage = isCategoryPageEntry(entry) ? entry : null;

	if (!categoryPage) {
		return Response.json({ error: "Category not found." }, { status: 404 });
	}

	const sourceTaxonomy = categoryPage.data.source_taxonomy;
	const sourceTermSlug = categoryPage.data.source_term_slug;
	const where =
		sourceTaxonomy && sourceTermSlug
			? {
					[sourceTaxonomy]: sourceTermSlug,
				}
			: undefined;

	const { entries } = await getEmDashCollection("games", where ? { where } : undefined);

	const games = (isGameEntryArray(entries) ? entries : [])
		.toSorted((left, right) => {
			const leftRank = left.data.rank ?? Number.MAX_SAFE_INTEGER;
			const rightRank = right.data.rank ?? Number.MAX_SAFE_INTEGER;
			if (leftRank !== rightRank) return leftRank - rightRank;
			return left.data.title.localeCompare(right.data.title);
		})
		.map((game) => ({
			id: game.id,
			slug: game.id,
			title: game.data.title,
			image_url: game.data.image_url ?? null,
			blurb: game.data.blurb ?? null,
			rank: game.data.rank ?? null,
		}));

	return Response.json({ items: games });
};
