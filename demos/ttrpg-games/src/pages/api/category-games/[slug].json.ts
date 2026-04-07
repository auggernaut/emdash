import type { APIRoute } from "astro";
import { getEmDashCollection, getTerm } from "emdash";

import type { GameEntry } from "../../../lib/types";

export const GET: APIRoute = async ({ params }) => {
	const slug = params.slug;
	if (!slug) {
		return Response.json({ error: "Missing category slug." }, { status: 400 });
	}

	const term = await getTerm("category", slug);
	if (!term) {
		return Response.json({ error: "Category not found." }, { status: 404 });
	}

	const { entries } = await getEmDashCollection("games", {
		where: { category: term.slug },
	});

	const games = (entries as unknown as GameEntry[])
		.sort((left, right) => {
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
