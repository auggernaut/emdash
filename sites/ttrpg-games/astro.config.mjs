import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { cloudflareCache, d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

import { categoryPageWidgetsPlugin } from "./src/plugins/category-page-widgets/index.ts";
import { relatedGamesWidgetPlugin } from "./src/plugins/related-widget/index.ts";

export default defineConfig({
	output: "server",
	trailingSlash: "never",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB" }),
			mcp: true,
			plugins: [relatedGamesWidgetPlugin(), categoryPageWidgetsPlugin()],
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	experimental: {
		cache: {
			provider: cloudflareCache({
				zoneIdEnvVar: "CF_ZONE_ID",
				apiTokenEnvVar: "CF_CACHE_PURGE_TOKEN",
			}),
		},
		routeRules: {
			"/": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/blog": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/blog/[slug]": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/categories": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/category/[slug]": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/item/[slug]": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/tools": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/tools/[slug]": {
				maxAge: 3_600,
				swr: 864_000,
			},
		},
	},
	devToolbar: { enabled: false },
});
