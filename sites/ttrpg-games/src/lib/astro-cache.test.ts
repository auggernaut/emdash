import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import { setAstroCacheHint } from "./astro-cache";

const CACHED_PAGE_URLS = [
	new URL("../pages/index.astro", import.meta.url),
	new URL("../pages/blog.astro", import.meta.url),
	new URL("../pages/blog/[slug].astro", import.meta.url),
	new URL("../pages/categories/index.astro", import.meta.url),
	new URL("../pages/category/[slug].astro", import.meta.url),
	new URL("../pages/item/[slug].astro", import.meta.url),
	new URL("../pages/tools.astro", import.meta.url),
	new URL("../pages/tools/[slug].astro", import.meta.url),
];

describe("setAstroCacheHint", () => {
	it("skips cache.set when Astro route caching is not enabled", () => {
		const set = vi.fn();

		setAstroCacheHint(
			{
				enabled: false,
				set,
			},
			{ tags: ["posts"] },
		);

		expect(set).not.toHaveBeenCalled();
	});

	it("forwards the hint once caching is enabled", () => {
		const set = vi.fn();
		const cacheHint = { tags: ["posts"] };

		setAstroCacheHint(
			{
				enabled: true,
				set,
			},
			cacheHint,
		);

		expect(set).toHaveBeenCalledWith(cacheHint);
	});
});

describe("cached page sources", () => {
	it("use the shared helper instead of bare Astro.cache.set calls", () => {
		for (const pageUrl of CACHED_PAGE_URLS) {
			const pageSource = readFileSync(pageUrl, "utf8");

			expect(pageSource).toContain("setAstroCacheHint(Astro.cache");
			expect(pageSource).not.toContain("Astro.cache.set(");
		}
	});
});
