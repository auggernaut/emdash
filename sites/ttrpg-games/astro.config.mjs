import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { cloudflareCache, d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

import { categoryPageWidgetsPlugin } from "./src/plugins/category-page-widgets/index.ts";
import { relatedGamesWidgetPlugin } from "./src/plugins/related-widget/index.ts";

const ASTRO_STYLE_MARKER_PATTERN = /@_@astro/g;
const LEADING_TRAILING_DASH_PATTERN = /^-|-$/g;
const MULTIPLE_DASHES_PATTERN = /-{2,}/g;
const UNSAFE_ASSET_SEGMENT_PATTERN = /[^A-Za-z0-9._/-]+/g;

function sanitizeAssetName(name) {
	const extensionStart = name.lastIndexOf(".");
	const basename = extensionStart === -1 ? name : name.slice(0, extensionStart);
	const extension = extensionStart === -1 ? "" : name.slice(extensionStart);
	const safeBasename =
		basename
			.replace(ASTRO_STYLE_MARKER_PATTERN, ".astro")
			.replace(UNSAFE_ASSET_SEGMENT_PATTERN, "-")
			.replace(MULTIPLE_DASHES_PATTERN, "-")
			.replace(LEADING_TRAILING_DASH_PATTERN, "") || "asset";

	return `${safeBasename}.[hash]${extension || "[extname]"}`;
}

export default defineConfig({
	output: "server",
	trailingSlash: "ignore",
	adapter: cloudflare(),
	vite: {
		build: {
			rollupOptions: {
				output: {
					assetFileNames: (assetInfo) => {
						const name = assetInfo.names?.[0] ?? assetInfo.name ?? "asset";
						return `_astro/${sanitizeAssetName(name)}`;
					},
				},
			},
		},
		ssr: {
			optimizeDeps: {
				exclude: ["@portabletext/toolkit"],
			},
		},
		optimizeDeps: {
			exclude: ["@portabletext/toolkit"],
		},
	},
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
				cacheName: "ttrpg-games-public-v2",
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
