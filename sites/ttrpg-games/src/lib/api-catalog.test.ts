import { describe, expect, it } from "vitest";

import { buildApiCatalog } from "./api-catalog.js";

describe("api catalog", () => {
	it("lists public JSON endpoints and marks the CMS MCP endpoint as authenticated", () => {
		const catalog = buildApiCatalog("https://www.ttrpg-games.com/");
		const anchors = catalog.linkset.map((entry) => entry.anchor);

		expect(anchors).toContain("https://www.ttrpg-games.com/api/games/{slug}.json");
		expect(anchors).toContain("https://www.ttrpg-games.com/api/category-games/{slug}.json");
		expect(anchors).toContain("https://www.ttrpg-games.com/api/blog-posts.json");

		const publicEntries = catalog.linkset.filter((entry) =>
			entry.anchor.startsWith("https://www.ttrpg-games.com/api/"),
		);
		expect(publicEntries.every((entry) => entry.authentication[0]?.value === "none")).toBe(true);

		const mcpEntry = catalog.linkset.find((entry) => entry.anchor.endsWith("/_emdash/api/mcp"));
		expect(mcpEntry?.authentication[0]?.value).toBe("required");
		expect(mcpEntry?.authentication[0]?.description).toContain("Not a public game-discovery API");
	});
});
