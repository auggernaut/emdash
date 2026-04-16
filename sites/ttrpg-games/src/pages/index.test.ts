import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("home page", () => {
	it("wraps game cover images in card-image containers for shared card styling", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('<div class="card-image">');
	});

	it("shows counted hero stats for games, categories, and articles", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('getEmDashCollection("posts")');
		expect(pageSource).toContain("<span>Games</span>");
		expect(pageSource).toContain("<span>Categories</span>");
		expect(pageSource).toContain("<span>Articles</span>");
		expect(pageSource).not.toContain("<span>Systems</span>");
		expect(pageSource).not.toContain("<span>Guides</span>");
		expect(pageSource).not.toContain('class="gold-star"');
	});
});
