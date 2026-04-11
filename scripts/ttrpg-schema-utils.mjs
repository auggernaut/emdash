const NON_ALPHANUMERIC_PATTERN = /[^a-z0-9]+/g;
const EDGE_HYPHENS_PATTERN = /^-+|-+$/g;
const REPEATED_HYPHENS_PATTERN = /-{2,}/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const AT_A_GLANCE_PATTERN =
	/<p>\s*(?:<strong>)?\s*At-a-glance:\s*(?:<\/strong>)?\s*([\s\S]*?)<\/p>/i;
const PLAYERS_WITH_ROLE_PATTERN =
	/(\d+)\s*[–-]\s*(\d+)\s*(?:players?)?\s*\+\s*(gm|warden|keeper|director|facilitator)/i;
const PLAYERS_ONLY_PATTERN = /(\d+)\s*[–-]\s*(\d+)\s*players?/i;
const SESSION_HOURS_PATTERN = /(\d+)\s*[–-]\s*(\d+)\s*(?:h|hours?)\s*(?:sessions?|one[- ]shots?)/i;
const ZERO_PREP_PATTERN = /\b(?:zero|near-zero)\s+prep\b/i;
const LOW_PREP_PATTERN = /\blow\s+prep\b/i;
const MEDIUM_PREP_PATTERN = /\bmedium\s+prep\b/i;
const HIGH_PREP_PATTERN = /\bhigh\s+prep\b/i;
const ONE_SHOT_PATTERN = /\bone[- ]shot\b/i;
const SOLO_PATTERN = /\bsolo\b/i;
const COLLAPSE_WHITESPACE_PATTERN = /\s+/g;

export const FACET_TAXONOMIES = [
	{
		name: "genre",
		label: "Genres",
		labelSingular: "Genre",
	},
	{
		name: "system",
		label: "Systems",
		labelSingular: "System",
	},
	{
		name: "mechanic",
		label: "Mechanics",
		labelSingular: "Mechanic",
	},
	{
		name: "theme",
		label: "Themes",
		labelSingular: "Theme",
	},
	{
		name: "decision_tag",
		label: "Decision Tags",
		labelSingular: "Decision Tag",
	},
];

const TYPE_TO_TAXONOMY = new Map([
	["Genres", "genre"],
	["Mechanics", "mechanic"],
	["Themes", "theme"],
]);

const SYSTEM_SLUGS = new Set([
	"5e",
	"d20-system",
	"forged-in-the-dark",
	"forged-in-the-dark-fitd",
	"gumshoe",
	"mork-borg",
	"old-school-renaissance-osr",
	"osr",
	"pbta",
	"powered-by-the-apocalypse",
	"powered-by-the-apocalypse-pbta",
	"year-zero-engine",
	"new-school-revolution",
	"cypher-system",
	"ezd6",
]);

const TERM_OVERRIDES = new Map([
	["award-winning", { taxonomy: "decision_tag", slug: "award-winning", label: "Award Winning" }],
	[
		"beginner-friendly",
		{ taxonomy: "decision_tag", slug: "beginner-friendly", label: "Beginner-Friendly" },
	],
	["collaborative", { taxonomy: "decision_tag", slug: "collaborative", label: "Collaborative" }],
	["cooperative", { taxonomy: "decision_tag", slug: "cooperative", label: "Cooperative" }],
	["d20-system", { taxonomy: "system", slug: "d20-system", label: "d20 System" }],
	["fan-made", { taxonomy: "decision_tag", slug: "fan-made", label: "Fan Made" }],
	[
		"forged-in-the-dark",
		{ taxonomy: "system", slug: "forged-in-the-dark", label: "Forged in the Dark" },
	],
	[
		"forged-in-the-dark-fitd",
		{ taxonomy: "system", slug: "forged-in-the-dark-fitd", label: "Forged in the Dark (FitD)" },
	],
	["free", { taxonomy: "decision_tag", slug: "free", label: "Free" }],
	["licensed", { taxonomy: "decision_tag", slug: "licensed", label: "Licensed" }],
	[
		"licensed-ip-unofficial",
		{ taxonomy: "decision_tag", slug: "licensed-ip-unofficial", label: "Licensed IP (Unofficial)" },
	],
	["low-prep", { taxonomy: "decision_tag", slug: "low-prep", label: "Low Prep" }],
	[
		"one-shot-friendly",
		{ taxonomy: "decision_tag", slug: "one-shot-friendly", label: "One-Shot Friendly" },
	],
	[
		"pbta",
		{
			taxonomy: "system",
			slug: "powered-by-the-apocalypse-pbta",
			label: "Powered by the Apocalypse (PbtA)",
		},
	],
	[
		"powered-by-the-apocalypse-pbta",
		{
			taxonomy: "system",
			slug: "powered-by-the-apocalypse-pbta",
			label: "Powered by the Apocalypse (PbtA)",
		},
	],
	["rules-medium", { taxonomy: "decision_tag", slug: "rules-medium", label: "Rules Medium" }],
	["sci-fi", { taxonomy: "genre", slug: "science-fiction", label: "Science Fiction" }],
	["year-zero-engine", { taxonomy: "system", slug: "year-zero-engine", label: "Year Zero Engine" }],
]);

const TRUE_CATEGORY_SLUGS = {
	beginner: new Set(["beginner-friendly"]),
	campaign: new Set(["campaign"]),
	oneShot: new Set(["one-shot-friendly"]),
	solo: new Set(["solo-play"]),
	gmLess: new Set(["gm-less", "cooperative"]),
};

function decodeHtmlEntities(value) {
	return value
		.replaceAll("&nbsp;", " ")
		.replaceAll("&amp;", "&")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">");
}

function stripTags(value) {
	return value.replace(HTML_TAG_PATTERN, " ").replace(COLLAPSE_WHITESPACE_PATTERN, " ").trim();
}

export function slugify(value) {
	return String(value ?? "")
		.normalize("NFKD")
		.toLowerCase()
		.replaceAll("&", " and ")
		.replaceAll(NON_ALPHANUMERIC_PATTERN, "-")
		.replaceAll(EDGE_HYPHENS_PATTERN, "")
		.replaceAll(REPEATED_HYPHENS_PATTERN, "-");
}

export function humanizeSlug(slug) {
	return slug
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function extractAtAGlance(bodyHtml) {
	if (!bodyHtml) return null;

	const match = bodyHtml.match(AT_A_GLANCE_PATTERN);
	if (!match?.[1]) return null;

	return decodeHtmlEntities(stripTags(match[1])) || null;
}

function parsePrepLevel(atAGlance, categorySlugs) {
	if (categorySlugs.includes("low-prep") || ZERO_PREP_PATTERN.test(atAGlance)) {
		return ZERO_PREP_PATTERN.test(atAGlance) ? "none" : "low";
	}

	if (MEDIUM_PREP_PATTERN.test(atAGlance)) return "medium";
	if (HIGH_PREP_PATTERN.test(atAGlance)) return "high";
	if (LOW_PREP_PATTERN.test(atAGlance)) return "low";

	return null;
}

function parsePlayers(atAGlance, categorySlugs) {
	if (categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.gmLess.has(slug))) {
		const gmLessMatch = atAGlance.match(PLAYERS_ONLY_PATTERN);
		if (gmLessMatch) {
			return {
				min_players: Number(gmLessMatch[1]),
				max_players: Number(gmLessMatch[2]),
				gm_required: false,
				gm_role_label: null,
			};
		}
	}

	const withRoleMatch = atAGlance.match(PLAYERS_WITH_ROLE_PATTERN);
	if (withRoleMatch) {
		return {
			min_players: Number(withRoleMatch[1]),
			max_players: Number(withRoleMatch[2]),
			gm_required: !categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.gmLess.has(slug)),
			gm_role_label: withRoleMatch[3].toUpperCase(),
		};
	}

	const playersOnlyMatch = atAGlance.match(PLAYERS_ONLY_PATTERN);
	if (!playersOnlyMatch) return null;

	const gmRequired = !categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.gmLess.has(slug));

	return {
		min_players: Number(playersOnlyMatch[1]),
		max_players: Number(playersOnlyMatch[2]),
		gm_required: gmRequired,
		gm_role_label: gmRequired ? "GM" : null,
	};
}

function parseSessionLength(atAGlance) {
	const match = atAGlance.match(SESSION_HOURS_PATTERN);
	if (!match) return null;

	return {
		session_length_minutes_min: Number(match[1]) * 60,
		session_length_minutes_max: Number(match[2]) * 60,
	};
}

export function deriveGameFields({ categorySlugs, bodyHtml }) {
	const atAGlance = extractAtAGlance(bodyHtml);
	const players = atAGlance ? parsePlayers(atAGlance, categorySlugs) : null;
	const sessionLength = atAGlance ? parseSessionLength(atAGlance) : null;
	const prepLevel = atAGlance ? parsePrepLevel(atAGlance, categorySlugs) : null;

	return {
		at_a_glance: atAGlance,
		min_players: players?.min_players ?? null,
		max_players: players?.max_players ?? null,
		gm_required: players?.gm_required ?? null,
		gm_role_label: players?.gm_role_label ?? null,
		session_length_minutes_min: sessionLength?.session_length_minutes_min ?? null,
		session_length_minutes_max: sessionLength?.session_length_minutes_max ?? null,
		prep_level: prepLevel,
		one_shot_friendly:
			categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.oneShot.has(slug)) ||
			(atAGlance ? ONE_SHOT_PATTERN.test(atAGlance) : false),
		campaign_friendly: categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.campaign.has(slug)),
		solo_friendly:
			categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.solo.has(slug)) ||
			(atAGlance ? SOLO_PATTERN.test(atAGlance) : false),
		beginner_friendly: categorySlugs.some((slug) => TRUE_CATEGORY_SLUGS.beginner.has(slug)),
	};
}

export function buildCategorySourceIndex(categoryRows) {
	const bySlug = new Map();

	for (const row of categoryRows) {
		const label = String(row.title ?? "").trim();
		if (!label) continue;

		const slug = String(row.page ?? "").trim() || slugify(label);
		bySlug.set(slug, {
			slug,
			label,
			type: String(row.type ?? "").trim(),
		});
	}

	return bySlug;
}

export function classifyCategoryTerm(term) {
	const override = TERM_OVERRIDES.get(term.slug);
	if (override) return override;

	if (SYSTEM_SLUGS.has(term.slug)) {
		return {
			taxonomy: "system",
			slug: term.slug,
			label: term.label,
		};
	}

	const taxonomy = TYPE_TO_TAXONOMY.get(term.type);
	if (!taxonomy) return null;

	return {
		taxonomy,
		slug: term.slug,
		label: term.label,
	};
}

export function buildFacetAssignments(
	categorySlugs,
	categorySourceBySlug,
	categoryLabelBySlug = new Map(),
) {
	const assignments = {};

	for (const categorySlug of categorySlugs) {
		const source =
			categorySourceBySlug.get(categorySlug) ??
			(categoryLabelBySlug.has(categorySlug)
				? { slug: categorySlug, label: categoryLabelBySlug.get(categorySlug), type: "" }
				: { slug: categorySlug, label: humanizeSlug(categorySlug), type: "" });
		const facet = classifyCategoryTerm(source);
		if (!facet) continue;

		assignments[facet.taxonomy] ||= [];
		if (!assignments[facet.taxonomy].includes(facet.slug)) {
			assignments[facet.taxonomy].push(facet.slug);
		}
	}

	return assignments;
}

export function buildFacetTerms(categoryTerms, categorySourceBySlug) {
	const facetTermsByTaxonomy = new Map(
		FACET_TAXONOMIES.map((taxonomy) => [taxonomy.name, new Map()]),
	);

	for (const term of categoryTerms) {
		const source = categorySourceBySlug.get(term.slug) ?? {
			slug: term.slug,
			label: term.label,
			type: "",
		};
		const facet = classifyCategoryTerm(source);
		if (!facet) continue;

		facetTermsByTaxonomy.get(facet.taxonomy)?.set(facet.slug, {
			slug: facet.slug,
			label: facet.label,
		});
	}

	return facetTermsByTaxonomy;
}
