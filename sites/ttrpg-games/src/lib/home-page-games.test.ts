import { describe, expect, it } from "vitest";

import { sortRecentlyAddedGames, topRatedCardLabelFor } from "./home-page-games";
import type { GameEntry } from "./types";

function makeGame(
	id: string,
	title: string,
	createdAt: string | null,
	publishedAt: string | null,
): GameEntry {
	return {
		id,
		data: {
			id,
			title,
			createdAt: createdAt ? new Date(createdAt) : null,
			publishedAt: publishedAt ? new Date(publishedAt) : null,
		},
	};
}

describe("sortRecentlyAddedGames", () => {
	it("orders games by data.createdAt and data.publishedAt descending", () => {
		const older = makeGame(
			"older",
			"Older Game",
			"2026-04-10T12:00:00.000Z",
			"2026-04-10T12:00:00.000Z",
		);
		const newest = makeGame(
			"newest",
			"Newest Game",
			"2026-04-14T17:26:05.865Z",
			"2026-04-14T17:26:58.609Z",
		);
		const newer = makeGame(
			"newer",
			"Newer Game",
			"2026-04-14T17:26:03.553Z",
			"2026-04-14T17:26:53.634Z",
		);

		const sorted = sortRecentlyAddedGames([older, newer, newest]);

		expect(sorted.map((game) => game.data.title)).toEqual([
			"Newest Game",
			"Newer Game",
			"Older Game",
		]);
	});
});

describe("topRatedCardLabelFor", () => {
	it("shows directory pick for top-rated games even when they have a numeric rank", () => {
		const game: GameEntry = {
			id: "cosmere-rpg",
			data: {
				id: "cosmere-rpg",
				title: "Cosmere RPG",
				rank: 255,
				is_top_rated: true,
			},
		};

		expect(topRatedCardLabelFor(game)).toBe("Directory pick");
	});
});
