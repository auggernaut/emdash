import type { RelatedGame } from "./types.js";

const DIACRITIC_PATTERN = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]/g;
const LEGACY_ITEM_SLUG_REDIRECTS = new Map([["agêratos", "ageratos"]]);

function normalizeLookupValue(value: string | undefined | null): string {
	return (value ?? "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(DIACRITIC_PATTERN, "")
		.replace(NON_ALPHANUMERIC_PATTERN, "");
}

export function resolveRelatedGameHref(related: Pick<RelatedGame, "slug" | "title">): string {
	const fallbackSlug = related.slug.trim() || normalizeLookupValue(related.title);
	const canonicalSlug = LEGACY_ITEM_SLUG_REDIRECTS.get(fallbackSlug) ?? fallbackSlug;
	return `/item/${encodeURIComponent(canonicalSlug)}`;
}
