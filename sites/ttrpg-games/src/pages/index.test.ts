import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("home page", () => {
	it("wraps game cover images in card-image containers for shared card styling", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('<div class="card-image">');
	});

	it("only loads hero stack artwork on desktop breakpoints", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('media="(min-width: 961px)"');
		expect(pageSource).toContain("const HERO_IMAGE_PLACEHOLDER");
		expect(pageSource).toContain("display: none;");
	});

	it("tightens mobile hero spacing beneath the header", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain("@media (max-width: 960px)");
		expect(pageSource).toContain('<div class="stack animate-up" style="--stack-gap: 80px; gap: var(--stack-gap);">');
		expect(pageSource).toContain("\t\t.hero-section {");
		expect(pageSource).toContain("padding: 140px 0 40px;");
		expect(pageSource).toContain("padding: 0 0 32px;");
		expect(pageSource).not.toContain('<section class="hero-section" style="padding: 140px 0 40px;">');
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
