import type { GameEntry } from "./types";

export interface TermSummary {
	slug: string;
	label: string;
}

export interface GameFacetGroups {
	genres: TermSummary[];
	systems: TermSummary[];
	mechanics: TermSummary[];
	themes: TermSummary[];
	compatibilities: TermSummary[];
	decisionTags: TermSummary[];
}

export interface GameScore {
	key: string;
	label: string;
	value: number;
}

export interface GameAgentProfile {
	slug: string;
	title: string;
	url: string;
	agentUrl: string;
	summary: {
		blurb: string | null;
		atAGlance: string | null;
		whyItFits: string | null;
	};
	constraints: {
		playerRange: string | null;
		sessionRange: string | null;
		setupMinutes: number | null;
		characterCreationMinutes: number | null;
		prepLevel: string | null;
		priceModel: string | null;
	};
	fit: {
		beginnerFriendly: boolean | null;
		newGmFriendly: number | null;
		oneShotFriendly: boolean | null;
		campaignFriendly: boolean | null;
		soloFriendly: boolean | null;
		improvBurden: string | null;
		structureLevel: string | null;
		contentIntensity: string | null;
	};
	scores: GameScore[];
	availability: {
		quickstartAvailable: boolean | null;
		pdfAvailable: boolean | null;
		physicalBookAvailable: boolean | null;
		vttReady: boolean | null;
	};
	recommendations: {
		bestFor: string[];
		avoidIf: string[];
	};
	facets: {
		genres: string[];
		systems: string[];
		mechanics: string[];
		themes: string[];
		compatibilities: string[];
		decisionTags: string[];
	};
	links: {
		websiteUrl: string | null;
		reviewsUrl: string | null;
	};
}

function normalizeTextList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => {
			if (typeof item === "string") return item;
			if (
				typeof item === "object" &&
				item !== null &&
				"text" in item &&
				typeof item.text === "string"
			) {
				return item.text;
			}
			return null;
		})
		.filter((item): item is string => Boolean(item && item.trim()))
		.map((item) => item.trim());
}

function humanizeToken(value: string | null | undefined): string | null {
	if (!value) return null;

	return value
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatMinutesRange(
	min: number | null | undefined,
	max: number | null | undefined,
): string | null {
	if (typeof min === "number" && typeof max === "number") {
		return min === max ? `${min} minutes` : `${min}-${max} minutes`;
	}

	if (typeof min === "number") return `${min}+ minutes`;
	if (typeof max === "number") return `Up to ${max} minutes`;
	return null;
}

function formatPlayerRange(game: GameEntry["data"]): string | null {
	const min = game.min_players;
	const max = game.max_players;

	if (typeof min !== "number" && typeof max !== "number") return null;

	const base =
		typeof min === "number" && typeof max === "number"
			? `${min}-${max} players`
			: typeof min === "number"
				? `${min}+ players`
				: `Up to ${max} players`;

	if (game.gm_required === false) return base;
	if (game.gm_role_label) return `${base} + ${game.gm_role_label}`;
	if (game.gm_required) return `${base} + GM`;
	return base;
}

function collectScores(game: GameEntry["data"]): GameScore[] {
	const pairs = [
		["complexity", "Complexity", game.complexity_score],
		["new_gm", "New GM Fit", game.new_gm_friendly],
		["roleplay", "Roleplay Focus", game.roleplay_focus],
		["combat", "Combat Focus", game.combat_focus],
		["tactical", "Tactical Depth", game.tactical_depth],
		["campaign", "Campaign Depth", game.campaign_depth],
	] as const;

	const scores: GameScore[] = [];

	for (const [key, label, value] of pairs) {
		if (typeof value !== "number") continue;
		scores.push({ key, label, value });
	}

	return scores;
}

export function buildGameAgentProfile({
	slug,
	game,
	facets,
	origin,
}: {
	slug: string;
	game: GameEntry;
	facets: GameFacetGroups;
	origin: string;
}): GameAgentProfile {
	const bestFor = normalizeTextList(game.data.best_for);
	const avoidIf = normalizeTextList(game.data.avoid_if);

	return {
		slug,
		title: game.data.title,
		url: `${origin}/item/${slug}`,
		agentUrl: `${origin}/api/games/${slug}.json`,
		summary: {
			blurb: game.data.blurb ?? null,
			atAGlance: game.data.at_a_glance ?? null,
			whyItFits: game.data.why_it_fits ?? null,
		},
		constraints: {
			playerRange: formatPlayerRange(game.data),
			sessionRange: formatMinutesRange(
				game.data.session_length_minutes_min,
				game.data.session_length_minutes_max,
			),
			setupMinutes: game.data.setup_minutes ?? null,
			characterCreationMinutes: game.data.character_creation_minutes ?? null,
			prepLevel: humanizeToken(game.data.prep_level),
			priceModel: humanizeToken(game.data.price_model),
		},
		fit: {
			beginnerFriendly: game.data.beginner_friendly ?? null,
			newGmFriendly: game.data.new_gm_friendly ?? null,
			oneShotFriendly: game.data.one_shot_friendly ?? null,
			campaignFriendly: game.data.campaign_friendly ?? null,
			soloFriendly: game.data.solo_friendly ?? null,
			improvBurden: humanizeToken(game.data.improv_burden),
			structureLevel: humanizeToken(game.data.structure_level),
			contentIntensity: humanizeToken(game.data.content_intensity),
		},
		scores: collectScores(game.data),
		availability: {
			quickstartAvailable: game.data.quickstart_available ?? null,
			pdfAvailable: game.data.pdf_available ?? null,
			physicalBookAvailable: game.data.physical_book_available ?? null,
			vttReady: game.data.vtt_ready ?? null,
		},
		recommendations: {
			bestFor,
			avoidIf,
		},
		facets: {
			genres: facets.genres.map((term) => term.label),
			systems: facets.systems.map((term) => term.label),
			mechanics: facets.mechanics.map((term) => term.label),
			themes: facets.themes.map((term) => term.label),
			compatibilities: facets.compatibilities.map((term) => term.label),
			decisionTags: facets.decisionTags.map((term) => term.label),
		},
		links: {
			websiteUrl: game.data.website_url ?? null,
			reviewsUrl: game.data.reviews_url ?? null,
		},
	};
}

export function buildGameStructuredData({
	game,
	agentProfile,
}: {
	game: GameEntry;
	agentProfile: GameAgentProfile;
}): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "Game",
		name: game.data.title,
		description: game.data.blurb ?? game.data.review_summary ?? undefined,
		url: agentProfile.url,
		image: game.data.image_url ?? undefined,
		genre: agentProfile.facets.genres,
		keywords: [
			...agentProfile.facets.systems,
			...agentProfile.facets.mechanics,
			...agentProfile.facets.themes,
			...agentProfile.facets.decisionTags,
		],
		audience: game.data.beginner_friendly
			? {
					"@type": "Audience",
					audienceType: "Beginner tabletop RPG players",
				}
			: undefined,
		isAccessibleForFree: game.data.is_free ?? false,
		additionalProperty: [
			{
				"@type": "PropertyValue",
				name: "Player Range",
				value: agentProfile.constraints.playerRange,
			},
			{
				"@type": "PropertyValue",
				name: "Session Range",
				value: agentProfile.constraints.sessionRange,
			},
			{
				"@type": "PropertyValue",
				name: "Complexity Score",
				value: game.data.complexity_score ?? undefined,
			},
			{
				"@type": "PropertyValue",
				name: "Prep Level",
				value: agentProfile.constraints.prepLevel,
			},
			{
				"@type": "PropertyValue",
				name: "New GM Fit",
				value: game.data.new_gm_friendly ?? undefined,
			},
			{
				"@type": "PropertyValue",
				name: "Structure Level",
				value: agentProfile.fit.structureLevel,
			},
			{
				"@type": "PropertyValue",
				name: "Best For",
				value: agentProfile.recommendations.bestFor.join(" | "),
			},
			{
				"@type": "PropertyValue",
				name: "Avoid If",
				value: agentProfile.recommendations.avoidIf.join(" | "),
			},
		].filter((item) => item.value !== null && item.value !== undefined && item.value !== ""),
	};
}
