import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("categories index page", () => {
	it("links the submit your game CTA to the live submission page", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('href="/submit-game"');
		expect(pageSource).not.toContain('href="/submit"');
	});
});
