import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: ["@lingui/babel-plugin-lingui-macro"],
			},
		}),
	],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		include: [
			"vitest-browser-react",
			"@lingui/core",
			"@lingui/react",
			"@tanstack/react-query",
			"@tanstack/react-router",
			"@tiptap/core",
			"@tiptap/starter-kit",
			"@tiptap/extension-link",
			"@tiptap/extension-character-count",
			"@tiptap/extension-focus",
			"@tiptap/extension-placeholder",
			"@tiptap/extension-text-align",
			"@tiptap/extension-typography",
			"@tiptap/react",
			"@tiptap/react/menus",
			"@tiptap/suggestion",
			"@floating-ui/react",
			"@phosphor-icons/react",
			"@cloudflare/kumo",
			"@cloudflare/kumo/components/chart",
			"echarts/charts",
			"echarts/components",
			"echarts/core",
			"echarts/renderers",
			"clsx",
			"tailwind-merge",
		],
	},
	test: {
		globals: true,
		include: ["tests/**/*.test.{ts,tsx}"],
		setupFiles: ["./tests/setup.ts"],
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
			headless: true,
		},
	},
});
