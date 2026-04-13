import type { PluginDescriptor } from "emdash";
import { definePlugin } from "emdash";

const entrypoint = "/src/plugins/related-widget/index.ts";
const adminEntry = "/src/plugins/related-widget/admin.tsx";

export function createPlugin() {
	return definePlugin({
		id: "ttrpg-related",
		version: "0.0.1",
		admin: {
			entry: adminEntry,
			fieldWidgets: [
				{
					name: "editor",
					label: "Related Games Editor",
					fieldTypes: ["json"],
				},
			],
		},
	});
}

export function relatedGamesWidgetPlugin(): PluginDescriptor {
	return {
		id: "ttrpg-related",
		version: "0.0.1",
		entrypoint,
		adminEntry,
	};
}

export default createPlugin;
