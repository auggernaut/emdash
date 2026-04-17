import { describe, expect, it } from "vitest";

import { resolvePageMeta, SITE_DEFAULT_OG_IMAGE_PATH } from "./page-meta.js";

describe("resolvePageMeta", () => {
	it("defaults canonical and image from the current page URL", () => {
		expect(
			resolvePageMeta({
				url: new URL("https://www.ttrpg-games.com/blog"),
			}),
		).toEqual({
			canonical: "https://www.ttrpg-games.com/blog",
			image: `https://www.ttrpg-games.com${SITE_DEFAULT_OG_IMAGE_PATH}`,
		});
	});

	it("normalizes the home canonical to the slashless origin", () => {
		expect(
			resolvePageMeta({
				url: new URL("https://www.ttrpg-games.com/"),
			}),
		).toEqual({
			canonical: "https://www.ttrpg-games.com",
			image: `https://www.ttrpg-games.com${SITE_DEFAULT_OG_IMAGE_PATH}`,
		});
	});

	it("converts relative image paths to absolute URLs", () => {
		expect(
			resolvePageMeta({
				url: new URL("https://www.ttrpg-games.com/category/fantasy"),
				image: "/_emdash/api/media/file/example-image.jpg",
			}),
		).toEqual({
			canonical: "https://www.ttrpg-games.com/category/fantasy",
			image: "https://www.ttrpg-games.com/_emdash/api/media/file/example-image.jpg",
		});
	});

	it("preserves absolute canonical and image URLs", () => {
		expect(
			resolvePageMeta({
				url: new URL("https://www.ttrpg-games.com/"),
				canonical: "https://www.ttrpg-games.com/",
				image: "https://cdn.example.com/social.png",
			}),
		).toEqual({
			canonical: "https://www.ttrpg-games.com",
			image: "https://cdn.example.com/social.png",
		});
	});
});
