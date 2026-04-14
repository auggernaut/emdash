import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("home page", () => {
	it("wraps game cover images in card-image containers for shared card styling", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('<div class="card-image">');
	});

	it("shows only counted hero stats", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).not.toContain('class="gold-star"');
	});
});
