import { describe, expect, it } from "vitest";

import astroConfig from "./astro.config.mjs";

describe("ttrpg-games Astro config", () => {
	it("enables Cloudflare route caching for the public content pages", () => {
		expect(astroConfig.experimental?.cache?.provider).toMatchObject({
			entrypoint: "@emdash-cms/cloudflare/cache",
			config: {
				zoneIdEnvVar: "CF_ZONE_ID",
				apiTokenEnvVar: "CF_CACHE_PURGE_TOKEN",
			},
		});

		expect(astroConfig.experimental?.routeRules).toMatchObject({
			"/": { maxAge: 3_600, swr: 864_000 },
			"/blog": { maxAge: 3_600, swr: 864_000 },
			"/blog/[slug]": { maxAge: 3_600, swr: 864_000 },
			"/categories": { maxAge: 3_600, swr: 864_000 },
			"/category/[slug]": { maxAge: 3_600, swr: 864_000 },
			"/item/[slug]": { maxAge: 3_600, swr: 864_000 },
			"/tools": { maxAge: 3_600, swr: 864_000 },
			"/tools/[slug]": { maxAge: 3_600, swr: 864_000 },
		});
	});
});
