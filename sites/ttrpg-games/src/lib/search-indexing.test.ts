import { describe, expect, it } from "vitest";

import { buildRobotsTxt, shouldBlockSearchIndexing } from "./search-indexing.js";

describe("preview search indexing", () => {
	it("blocks workers.dev hosts from crawling", () => {
		expect(shouldBlockSearchIndexing("ttrpg-games.augman.workers.dev")).toBe(true);
		expect(
			buildRobotsTxt("https://ttrpg-games.augman.workers.dev", "ttrpg-games.augman.workers.dev"),
		).toBe(["User-agent: *", "Disallow: /"].join("\n"));
	});

	it("keeps the launch domain crawlable and advertises its sitemap", () => {
		expect(shouldBlockSearchIndexing("www.ttrpg-games.com")).toBe(false);
		expect(buildRobotsTxt("https://www.ttrpg-games.com/", "www.ttrpg-games.com")).toBe(
			[
				"User-agent: *",
				"Allow: /",
				"",
				"# Disallow admin and API routes",
				"Disallow: /_emdash/",
				"",
				"Sitemap: https://www.ttrpg-games.com/sitemap.xml",
			].join("\n"),
		);
	});
});
