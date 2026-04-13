import type { PluginDescriptor } from "emdash";
import { definePlugin } from "emdash";

const entrypoint = "/src/plugins/category-page-widgets/index.ts";
const adminEntry = "/src/plugins/category-page-widgets/admin.tsx";

export function createPlugin() {
	return definePlugin({
		id: "ttrpg-category-pages",
		version: "0.0.1",
		admin: {
			entry: adminEntry,
			fieldWidgets: [
				{
					name: "gameNotes",
					label: "Category Game Notes Editor",
					fieldTypes: ["json"],
				},
				{
					name: "faqEditor",
					label: "Category FAQ Editor",
					fieldTypes: ["json"],
				},
				{
					name: "relatedCategories",
					label: "Related Categories Editor",
					fieldTypes: ["json"],
				},
			],
		},
	});
}

export function categoryPageWidgetsPlugin(): PluginDescriptor {
	return {
		id: "ttrpg-category-pages",
		version: "0.0.1",
		entrypoint,
		adminEntry,
	};
}

export default createPlugin;
