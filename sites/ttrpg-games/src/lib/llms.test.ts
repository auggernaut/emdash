import { describe, expect, it } from "vitest";

import { buildLlmsTxt } from "./llms.js";

describe("llms.txt", () => {
	it("describes the public site and machine-readable interfaces", () => {
		const text = buildLlmsTxt("https://www.ttrpg-games.com/");

		expect(text).toContain("# TTRPG Games Directory");
		expect(text).toContain("https://www.ttrpg-games.com/api/games/{slug}.json");
		expect(text).toContain("https://www.ttrpg-games.com/.well-known/api-catalog");
		expect(text).toContain("Accept: text/markdown");
		expect(text).not.toContain("/_emdash/api/mcp");
	});
});
