import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { d1, r2 } from "@emdash-cms/cloudflare";

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
			database: d1({ binding: "DB", session: "auto" }),
			mcp: true,
			plugins: [relatedGamesWidgetPlugin(), categoryPageWidgetsPlugin()],
			storage: r2({ binding: "MEDIA" }),
		}),
	],
	devToolbar: { enabled: false },
});
