import { describe, expect, it } from "vitest";

import { resolveRelatedGameHref } from "./related-games.js";

describe("resolveRelatedGameHref", () => {
	it("uses the provided slug when it is already canonical", () => {
		expect(resolveRelatedGameHref({ slug: "ars-magica", title: "Ars Magica" })).toBe(
			"/item/ars-magica",
		);
	});

	it("rewrites legacy slugs through the known redirect map", () => {
		expect(resolveRelatedGameHref({ slug: "agêratos", title: "Agêratos" })).toBe(
			"/item/ageratos",
		);
	});

	it("falls back to a normalized title when the slug is empty", () => {
		expect(resolveRelatedGameHref({ slug: "", title: "Old-School Essentials" })).toBe(
			"/item/oldschoolessentials",
		);
	});
});
