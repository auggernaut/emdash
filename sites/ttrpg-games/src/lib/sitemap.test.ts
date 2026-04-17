import { describe, expect, it } from "vitest";

import { latestSitemapLastmod, normalizeSitemapLastmod } from "./sitemap.js";

describe("normalizeSitemapLastmod", () => {
	it("converts sqlite datetimes into ISO 8601 timestamps", () => {
		expect(normalizeSitemapLastmod("2026-04-14 16:55:01")).toBe("2026-04-14T16:55:01.000Z");
	});

	it("preserves ISO 8601 timestamps", () => {
		expect(normalizeSitemapLastmod("2026-04-14T17:27:10.182Z")).toBe(
			"2026-04-14T17:27:10.182Z",
		);
	});

	it("falls back to a valid date when only a date prefix is usable", () => {
		expect(normalizeSitemapLastmod("2026-04-14 bad-data")).toBe("2026-04-14");
	});
});

describe("latestSitemapLastmod", () => {
	it("picks the latest timestamp across mixed stored formats", () => {
		expect(
			latestSitemapLastmod([
				"2026-04-11 12:30:02",
				"2026-04-14T17:27:10.182Z",
				"2026-04-13 20:20:57",
			]),
		).toBe("2026-04-14T17:27:10.182Z");
	});
});
