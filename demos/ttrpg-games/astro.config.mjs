import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

import { categoryPageWidgetsPlugin } from "./src/plugins/category-page-widgets/index.ts";
import { relatedGamesWidgetPlugin } from "./src/plugins/related-widget/index.ts";

export default defineConfig({
	output: "server",
	trailingSlash: "never",
	adapter: node({
		mode: "standalone",
	}),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			plugins: [relatedGamesWidgetPlugin(), categoryPageWidgetsPlugin()],
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
		}),
	],
	devToolbar: { enabled: false },
});
