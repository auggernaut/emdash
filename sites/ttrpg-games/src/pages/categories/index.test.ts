import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("categories index page", () => {
	it("links the submit your game CTA to the live submission page", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain('href="/submit-game"');
		expect(pageSource).not.toContain('href="/submit"');
	});

	it("uses the shared stack gap variable for mobile header spacing", () => {
		const pageSource = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

		expect(pageSource).toContain("--stack-gap: 56px; gap: var(--stack-gap);");
		expect(pageSource).toContain("@media (max-width: 960px)");
		expect(pageSource).toContain("padding: 0 0 32px;");
	});
});
