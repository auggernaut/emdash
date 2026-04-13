import type { APIRoute } from "astro";
import { getEmDashEntry, getEntryTerms } from "emdash";

import { buildGameAgentProfile } from "../../../lib/game-profile";
import type { GameEntry } from "../../../lib/types";

function isGameEntry(value: unknown): value is GameEntry {
	return value !== null && typeof value === "object" && "data" in value;
}

export const GET: APIRoute = async ({ params, url }) => {
	const slug = params.slug;
	if (!slug) {
		return Response.json({ error: "Missing game slug." }, { status: 400 });
	}

	const { entry } = await getEmDashEntry("games", slug);
	const game = isGameEntry(entry) ? entry : null;

	if (!game) {
		return Response.json({ error: "Game not found." }, { status: 404 });
	}

	const [genres, systems, mechanics, themes, decisionTags] = await Promise.all([
		getEntryTerms("games", game.data.id, "genre"),
		getEntryTerms("games", game.data.id, "system"),
		getEntryTerms("games", game.data.id, "mechanic"),
		getEntryTerms("games", game.data.id, "theme"),
		getEntryTerms("games", game.data.id, "decision_tag"),
	]);

	return Response.json(
		buildGameAgentProfile({
			slug,
			game,
			facets: {
				genres,
				systems,
				mechanics,
				themes,
				decisionTags,
			},
			origin: url.origin,
		}),
	);
};
