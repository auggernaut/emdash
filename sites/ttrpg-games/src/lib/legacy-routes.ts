export const LEGACY_ITEM_SLUG_REDIRECTS = new Map<string, string>([
	["agêratos", "ageratos"],
	["a-quiet-year", "aquietyear"],
	["alien", "alienrpg"],
	["avatar-legends", "avatarlegends"],
	["basicfantasyrpg", "basic-fantasy"],
	["blades-in-the-dark", "bladesinthedark"],
	["castles-crusades", "castlescrusades"],
	["cyberpunk2020", "cyberpunk"],
	["deathinspace", "death-in-space"],
	["dungeon-crawl-classics", "dungeoncrawlclassics"],
	["dungeon-world", "dungeonworld"],
	["electricbastionland", "electric-bastionland"],
	["knave-rpg-review-classless-osr-system-by-questing-beast", "knave"],
	["liminalhorror", "liminal-horror"],
	["maze-rats", "mazerats"],
	["mork-borg", "morkborg"],
	["mouseguard", "mouse-guard"],
	["mrk-borg", "morkborg"],
	["mutant-year-zero", "mutantyearzero"],
	["old-school-essentials", "oldschoolessentials"],
	["oldschool-essentials", "oldschoolessentials"],
	["scarlet-heroes", "scarletheroes"],
	["stars-without-number", "starswithoutnumber"],
	["swords-wizardry", "swords-and-wizardry"],
	["ten-candles", "tencandles"],
	["the-black-hack", "theblackhack"],
	["the-quiet-year", "aquietyear"],
	["the-wretched", "thewretched"],
	["theonering", "the-one-ring"],
	["urban-shadows", "urbanshadows"],
	["warhammerfantasy", "warhammer-fantasy-roleplay"],
]);

export const LEGACY_CATEGORY_PATH_REDIRECTS = new Map<string, string>([
	["forged-in-the-dark", "/category/forged-in-the-dark-fitd"],
	["pbta", "/category/powered-by-the-apocalypse-pbta"],
	["powered-by-the-apocalypse", "/category/powered-by-the-apocalypse-pbta"],
	["solo", "/category/solo-play"],
	["solo-rpgs", "/category/solo-play"],
	["solo-ttrpgs", "/category/solo-play"],
	["superhero", "/category/superheroes"],
	["superhero-rpg", "/category/superheroes"],
	["superhero-ttrpg", "/category/superheroes"],
]);

export const LEGACY_BLOG_SLUG_REDIRECTS = new Map<string, string>([
	[
		"5-rules-light-ttrpgs-you-can-learn-and-run-under-30-minutes",
		"rules-light-ttrpgs-learn-run-under-30-minutes",
	],
	[
		"top-10-rules-light-ttrpgs-that-are-perfect-for-quick-game-nights",
		"rules-light-ttrpgs-perfect-quick-game-nights",
	],
]);

const TRAILING_SLASH_PATTERN = /\/+$/;
const ITEM_PATH_PATTERN = /^\/item\/([^/]+)$/;
const CATEGORY_PATH_PATTERN = /^\/category\/([^/]+)$/;
const BLOG_PATH_PATTERN = /^\/blog\/([^/]+)$/;

function decodePathSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

export function resolveLegacyItemSlug(slug: string): string {
	return LEGACY_ITEM_SLUG_REDIRECTS.get(slug) ?? slug;
}

export function resolveItemHref(slug: string): string {
	return `/item/${encodeURIComponent(resolveLegacyItemSlug(slug))}`;
}

export function getLegacyItemRedirectPath(slug: string): string | null {
	const canonicalSlug = LEGACY_ITEM_SLUG_REDIRECTS.get(slug);
	return canonicalSlug ? `/item/${encodeURIComponent(canonicalSlug)}` : null;
}

export function resolveCategoryHref(slug: string): string {
	return LEGACY_CATEGORY_PATH_REDIRECTS.get(slug) ?? `/category/${encodeURIComponent(slug)}`;
}

export function getLegacyCategoryRedirectPath(slug: string): string | null {
	return LEGACY_CATEGORY_PATH_REDIRECTS.get(slug) ?? null;
}

export function getLegacyBlogRedirectPath(slug: string): string | null {
	const canonicalSlug = LEGACY_BLOG_SLUG_REDIRECTS.get(slug);
	return canonicalSlug ? `/blog/${encodeURIComponent(canonicalSlug)}` : null;
}

export function getLegacyRedirectPathForPathname(pathname: string): string | null {
	if (pathname.startsWith("/_emdash/")) return null;

	const normalizedPathname =
		pathname.length > 1 ? pathname.replace(TRAILING_SLASH_PATTERN, "") : pathname;
	const itemMatch = ITEM_PATH_PATTERN.exec(normalizedPathname);
	if (itemMatch?.[1]) {
		const redirectPath = getLegacyItemRedirectPath(decodePathSegment(itemMatch[1]));
		if (redirectPath) return redirectPath;
	}

	const categoryMatch = CATEGORY_PATH_PATTERN.exec(normalizedPathname);
	if (categoryMatch?.[1]) {
		const redirectPath = getLegacyCategoryRedirectPath(decodePathSegment(categoryMatch[1]));
		if (redirectPath) return redirectPath;
	}

	const blogMatch = BLOG_PATH_PATTERN.exec(normalizedPathname);
	if (blogMatch?.[1]) {
		const redirectPath = getLegacyBlogRedirectPath(decodePathSegment(blogMatch[1]));
		if (redirectPath) return redirectPath;
	}

	return normalizedPathname !== pathname ? normalizedPathname : null;
}
