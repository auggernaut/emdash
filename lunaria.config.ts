import { defineConfig } from "@lunariajs/core/config";

import { SOURCE_LOCALE, TARGET_LOCALES } from "./packages/admin/src/locales/locales.js";

type LunariaLocale = { label: string; lang: string };

function getTargetLocales(): [LunariaLocale, ...LunariaLocale[]] {
	const locales = TARGET_LOCALES.map((locale) => ({
		label: locale.label,
		lang: locale.code,
	}));
	const [first, ...rest] = locales;
	if (!first) {
		throw new Error("Lunaria requires at least one target locale");
	}
	return [first, ...rest];
}

export default defineConfig({
	repository: {
		name: "emdash-cms/emdash",
		branch: "main",
	},
	sourceLocale: {
		label: SOURCE_LOCALE.label,
		lang: SOURCE_LOCALE.code,
	},
	locales: getTargetLocales(),
	files: [
		{
			include: ["packages/admin/src/locales/en/messages.po"],
			pattern: "packages/admin/src/locales/@lang/messages.po",
			type: "dictionary",
		},
	],
});
