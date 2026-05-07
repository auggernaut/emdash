import { describe, expect, it } from "vitest";

import {
	getLegacyBlogRedirectPath,
	getLegacyCategoryRedirectPath,
	getLegacyItemRedirectPath,
	getLegacyRedirectPathForPathname,
	resolveCategoryHref,
} from "./legacy-routes.js";
import { resolveRelatedGameHref } from "./related-games.js";

describe("resolveRelatedGameHref", () => {
	it("uses the provided slug when it is already canonical", () => {
		expect(resolveRelatedGameHref({ slug: "ars-magica", title: "Ars Magica" })).toBe(
			"/item/ars-magica",
		);
	});

	it("rewrites legacy slugs through the known redirect map", () => {
		expect(resolveRelatedGameHref({ slug: "agêratos", title: "Agêratos" })).toBe("/item/ageratos");
		expect(resolveRelatedGameHref({ slug: "mutant-year-zero", title: "Mutant: Year Zero" })).toBe(
			"/item/mutantyearzero",
		);
		expect(resolveRelatedGameHref({ slug: "cyberpunk2020", title: "Cyberpunk 2020" })).toBe(
			"/item/cyberpunk",
		);
	});

	it("falls back to a normalized title when the slug is empty", () => {
		expect(resolveRelatedGameHref({ slug: "", title: "Old-School Essentials" })).toBe(
			"/item/oldschoolessentials",
		);
	});
});

describe("legacy route redirects", () => {
	it("redirects legacy item slugs to their current game pages", () => {
		expect(getLegacyItemRedirectPath("electricbastionland")).toBe("/item/electric-bastionland");
		expect(getLegacyItemRedirectPath("old-school-essentials")).toBe("/item/oldschoolessentials");
		expect(getLegacyItemRedirectPath("mork-borg")).toBe("/item/morkborg");
	});

	it("redirects legacy category slugs to current destinations", () => {
		expect(getLegacyCategoryRedirectPath("forged-in-the-dark")).toBe(
			"/category/forged-in-the-dark-fitd",
		);
		expect(resolveCategoryHref("year-zero-engine")).toBe("/search?q=Year%20Zero%20Engine");
	});

	it("redirects legacy blog slugs to their current articles", () => {
		expect(
			getLegacyBlogRedirectPath("5-rules-light-ttrpgs-you-can-learn-and-run-under-30-minutes"),
		).toBe("/blog/rules-light-ttrpgs-learn-run-under-30-minutes");
		expect(
			getLegacyBlogRedirectPath("top-10-rules-light-ttrpgs-that-are-perfect-for-quick-game-nights"),
		).toBe("/blog/rules-light-ttrpgs-perfect-quick-game-nights");
	});

	it("matches legacy route redirects from trailing-slash pathnames", () => {
		expect(getLegacyRedirectPathForPathname("/item/alien/")).toBe("/item/alienrpg");
		expect(getLegacyRedirectPathForPathname("/category/year-zero-engine/")).toBe(
			"/search?q=Year%20Zero%20Engine",
		);
		expect(
			getLegacyRedirectPathForPathname(
				"/blog/top-10-rules-light-ttrpgs-that-are-perfect-for-quick-game-nights/",
			),
		).toBe("/blog/rules-light-ttrpgs-perfect-quick-game-nights");
	});

	it("normalizes non-admin trailing slashes", () => {
		expect(getLegacyRedirectPathForPathname("/categories/")).toBe("/categories");
		expect(getLegacyRedirectPathForPathname("/_emdash/admin/")).toBeNull();
	});
});
