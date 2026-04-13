import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = "/Users/home/Dev/git/emdash";
const databasePath = path.join(rootDir, "sites/ttrpg-games/data.db");
const backupsDir = path.join(rootDir, "sites/ttrpg-games/backups");
const HTML_TAG_PATTERN = /<[^>]+>/g;
const HTML_NBSP_PATTERN = /&nbsp;/g;
const HTML_AMP_PATTERN = /&amp;/g;
const HTML_QUOT_PATTERN = /&quot;/g;
const HTML_APOS_PATTERN = /&#39;/g;
const MULTISPACE_PATTERN = /\s+/g;
const SENTENCE_SPLIT_PATTERN = /(?<=[.!?])\s+/;
const TITLE_REVIEW_SUFFIX_PATTERN = /\s+RPG Review:.*$/i;
const WHY_NEEDS_REWRITE_PATTERN = /directory|reader/i;
const TRAILING_PERIOD_PATTERN = /\.$/;
const H2_PATTERN = /<h2>/i;
const BOTTOM_LINE_SECTION_PATTERN = /<h2>\s*Bottom line\s*<\/h2>[\s\S]*$/i;
const LOSE_PEOPLE_HEADING_PATTERN = /<h2>\s*Where it can lose people\s*<\/h2>/gi;
const MAY_NOT_LAND_HEADING_PATTERN = /<h2>\s*Where it may not land\s*<\/h2>/gi;
const LOSES_READERS_HEADING_PATTERN = /<h2>\s*Where it loses readers\s*<\/h2>/gi;
const EXCESS_NEWLINES_PATTERN = /\n{3,}/g;
const LEADING_AT_A_GLANCE_HTML_PATTERN = /^<p>\s*(?:<strong>)?At.{0,2}a-glance:.*?<\/p>\s*/is;
const LEADING_AT_A_GLANCE_TEXT_PATTERN = /^At.{0,2}a-glance:.*?(?:\n\s*){1,2}/is;
const MIN_STRUCTURED_BODY_LENGTH = 300;
const REQUIRED_BODY_HEADING_PATTERNS = [
	/<h2>\s*Theme and Setting\s*<\/h2>/i,
	/<h2>\s*How Play Feels\s*<\/h2>/i,
	/<h2>\s*What Makes It Distinct\s*<\/h2>/i,
	/<h2>\s*Where It May Not Fit\s*<\/h2>/i,
];
const LEADING_INLINE_AT_A_GLANCE_PATTERN =
	/^(?:<p>\s*(?:<strong>)?)?At(?:[-‑–—\s])?a(?:[-‑–—\s])?glance:.*?(?=<h2>)/is;
const PLAYER_RANGE_PATTERN = /(\d+)\s*[–—-]\s*(\d+)\s*(?:players?|people)\b/i;
const PLAYER_PLUS_PATTERN = /(\d+)\s*\+\s*(?:players?|people)\b/i;
const SINGLE_PLAYER_PATTERN = /\b1\s+player\b/i;
const SESSION_MINUTES_RANGE_PATTERN = /(\d+)\s*[–—-]\s*(\d+)\s*(?:min(?:ute)?s?)\b/i;
const SESSION_HOURS_RANGE_PATTERN = /(\d+)\s*[–—-]\s*(\d+)\s*h(?:ours?)?\b/i;
const SESSION_HOURS_WORD_RANGE_PATTERN = /(\d+)\s*[–—-]\s*(\d+)\s*hours?\b/i;
const SESSION_SINGLE_HOUR_PATTERN = /\b(\d+)\s*hours?\b/i;
const SESSION_SINGLE_MINUTE_PATTERN = /\b(\d+)\s*min(?:ute)?s?\b/i;
const AT_A_GLANCE_GARBAGE_PATTERN =
	/theme and setting|core mechanics|what makes it unique|target audience/i;
const SOLO_TEXT_PATTERN = /\bsolo\b/i;
const GM_LESS_TEXT_PATTERN = /gm(?:[-‑–—\s])?less|without a traditional gm|no gm|cooperative/i;
const STRUCTURED_HEADING_TEXT_PATTERN =
	/^(theme and setting|how play feels|what makes it distinct|where it may not fit)\s*/i;
const HTML_H2_PATTERN = /<h2>\s*[^<]+<\/h2>/gi;
const LEADING_GENERATED_AT_A_GLANCE_PATTERN = /^At(?:[-‑–—\s])?a(?:[-‑–—\s])?glance:.*$/i;
const LEGACY_INLINE_SECTION_LABEL_PATTERN =
	/<p>\s*(?:theme and setting|core mechanics and rules|target audience|what makes it unique|player experience)\b|\b(?:core mechanics and rules|target audience|what makes it unique|player experience)\b/i;
const LEGACY_SENTENCE_LABEL_PATTERN =
	/\b(core mechanics and rules|target audience|what makes it unique|player experience)\b[:\s-]*/gi;
const HEADING_NORMALIZATION_PATTERNS = [
	[/<h2>\s*theme and setting\s*<\/h2>/gi, "<h2>Theme and Setting</h2>"],
	[/<h2>\s*how play feels\s*<\/h2>/gi, "<h2>How Play Feels</h2>"],
	[/<h2>\s*what makes it distinct\s*<\/h2>/gi, "<h2>What Makes It Distinct</h2>"],
	[/<h2>\s*where it may not fit\s*<\/h2>/gi, "<h2>Where It May Not Fit</h2>"],
];
const DUPLICATED_THEME_PREFIX_PATTERN = /^(.*?) is built around \1 is /i;
const RECOMMENDATION_PREFIX_PATTERNS = [
	/^groups that want\s+/i,
	/^tables that want\s+/i,
	/^players who want\s+/i,
	/^groups already comfortable with\s+/i,
	/^players who enjoy\s+/i,
	/^groups that enjoy\s+/i,
	/^groups that like\s+/i,
	/^tables that like\s+/i,
	/^players interested in\s+/i,
	/^long-form\s+/i,
];
const BODY_REPLACEMENTS = [
	[/belongs in the directory because/gi, "works especially well when"],
	[/deserves a directory slot because/gi, "stands out because"],
	[/deserves its place in the directory because/gi, "stands out because"],
	[/earns its directory slot by/gi, "stands out by"],
	[/worth the space in the directory because/gi, "works especially well when"],
	[/worth preserving in the directory because/gi, "stands out because"],
	[/strong directory entry/gi, "strong pick"],
	[/directory slot/gi, "place in the field"],
	[/directory entry/gi, "pick"],
	[/readers looking for/gi, "players looking for"],
	[/for readers who want/gi, "for players who want"],
	[/readers who want/gi, "players who want"],
	[/readers who love/gi, "players who love"],
	[/readers eager/gi, "players eager"],
	[/readers of/gi, "fans of"],
];

function pad2(value) {
	return String(value).padStart(2, "0");
}

function nowStamp() {
	const date = new Date();
	return [
		date.getFullYear(),
		pad2(date.getMonth() + 1),
		pad2(date.getDate()),
		"-",
		pad2(date.getHours()),
		pad2(date.getMinutes()),
		pad2(date.getSeconds()),
	].join("");
}

function backupDatabase() {
	fs.mkdirSync(backupsDir, { recursive: true });
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-game-page-normalize.db`);
	fs.copyFileSync(databasePath, backupPath);
	for (const suffix of ["-wal", "-shm"]) {
		const sidecar = `${databasePath}${suffix}`;
		if (fs.existsSync(sidecar)) {
			fs.copyFileSync(sidecar, `${backupPath}${suffix}`);
		}
	}
	return backupPath;
}

function runSql(sql) {
	return execFileSync("sqlite3", [databasePath], {
		encoding: "utf8",
		input: sql,
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["pipe", "pipe", "pipe"],
	}).trim();
}

function runJson(sql) {
	const output = execFileSync("sqlite3", ["-json", databasePath], {
		encoding: "utf8",
		input: sql,
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["pipe", "pipe", "pipe"],
	}).trim();
	return output ? JSON.parse(output) : [];
}

function sqlString(value) {
	if (value == null) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function humanizeSlug(value) {
	return String(value)
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function lowerFirst(value) {
	return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function stripHtml(value) {
	return String(value || "")
		.replace(HTML_TAG_PATTERN, " ")
		.replace(HTML_NBSP_PATTERN, " ")
		.replace(HTML_AMP_PATTERN, "&")
		.replace(HTML_QUOT_PATTERN, '"')
		.replace(HTML_APOS_PATTERN, "'")
		.replace(MULTISPACE_PATTERN, " ")
		.trim();
}

function splitSentences(text) {
	return stripHtml(text)
		.split(SENTENCE_SPLIT_PATTERN)
		.map((sentence) => sentence.trim())
		.filter(Boolean);
}

function uniquePush(target, value) {
	if (!value) return;
	if (!target.includes(value)) target.push(value);
}

function titleWithoutReviewSuffix(title) {
	return String(title || "")
		.replace(TITLE_REVIEW_SUFFIX_PATTERN, "")
		.trim();
}

function parseJsonList(value) {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((item) => {
				if (typeof item === "string") return item;
				if (item && typeof item === "object" && typeof item.text === "string") return item.text;
				return null;
			})
			.filter(Boolean);
	} catch {
		return [];
	}
}

function normalizeBoolean(value) {
	if (value == null) return null;
	return Boolean(value);
}

function hasStructuredBodyHeadings(value) {
	const source = String(value || "");
	return REQUIRED_BODY_HEADING_PATTERNS.every((pattern) => pattern.test(source));
}

function shouldRewriteAtAGlance(value) {
	const text = String(value || "").trim();
	if (!text) return true;
	if (text.includes("\n")) return true;
	if (text.includes("<")) return true;
	if (AT_A_GLANCE_GARBAGE_PATTERN.test(text)) return true;
	if (text.length > 140) return true;
	const parts = text
		.split("•")
		.map((part) => part.trim())
		.filter(Boolean);
	return parts.length < 3;
}

function sourceBlob(game) {
	return [game.at_a_glance, game.body_html, game.review_summary, game.blurb]
		.filter(Boolean)
		.join(" ");
}

function inferPlayerRange(text, game, terms) {
	const source = String(text || "");
	const rangeMatch = source.match(PLAYER_RANGE_PATTERN);
	if (rangeMatch) {
		return {
			minPlayers: Number(rangeMatch[1]),
			maxPlayers: Number(rangeMatch[2]),
		};
	}

	const plusMatch = source.match(PLAYER_PLUS_PATTERN);
	if (plusMatch) {
		const minPlayers = Number(plusMatch[1]);
		return {
			minPlayers,
			maxPlayers: minPlayers + 3,
		};
	}

	if (SINGLE_PLAYER_PATTERN.test(source) || SOLO_TEXT_PATTERN.test(source)) {
		return { minPlayers: 1, maxPlayers: 1 };
	}

	const mechanicSlugs = new Set(terms.mechanic.map((item) => item.slug));
	const systemSlugs = new Set(terms.system.map((item) => item.slug));

	if (normalizeBoolean(game.solo_friendly)) {
		return GM_LESS_TEXT_PATTERN.test(source)
			? { minPlayers: 1, maxPlayers: 4 }
			: { minPlayers: 1, maxPlayers: 1 };
	}
	if (GM_LESS_TEXT_PATTERN.test(source)) return { minPlayers: 2, maxPlayers: 4 };
	if (
		systemSlugs.has("d20-system") ||
		systemSlugs.has("old-school-renaissance-osr") ||
		mechanicSlugs.has("tactical-combat")
	) {
		return { minPlayers: 3, maxPlayers: 5 };
	}
	return { minPlayers: 2, maxPlayers: 5 };
}

function inferSessionRange(text, game) {
	const source = String(text || "");
	const minutesMatch = source.match(SESSION_MINUTES_RANGE_PATTERN);
	if (minutesMatch) {
		return {
			sessionMin: Number(minutesMatch[1]),
			sessionMax: Number(minutesMatch[2]),
		};
	}

	const hoursRangeMatch =
		source.match(SESSION_HOURS_RANGE_PATTERN) || source.match(SESSION_HOURS_WORD_RANGE_PATTERN);
	if (hoursRangeMatch) {
		return {
			sessionMin: Number(hoursRangeMatch[1]) * 60,
			sessionMax: Number(hoursRangeMatch[2]) * 60,
		};
	}

	const singleHourMatch = source.match(SESSION_SINGLE_HOUR_PATTERN);
	if (singleHourMatch) {
		const minutes = Number(singleHourMatch[1]) * 60;
		return { sessionMin: minutes, sessionMax: minutes };
	}

	const singleMinuteMatch = source.match(SESSION_SINGLE_MINUTE_PATTERN);
	if (singleMinuteMatch) {
		const minutes = Number(singleMinuteMatch[1]);
		return { sessionMin: minutes, sessionMax: minutes };
	}

	if (normalizeBoolean(game.one_shot_friendly)) {
		return { sessionMin: 60, sessionMax: 180 };
	}
	if (normalizeBoolean(game.solo_friendly)) {
		return { sessionMin: 45, sessionMax: 120 };
	}
	return { sessionMin: 120, sessionMax: 240 };
}

function inferPrepLevel(text, game, terms) {
	const source = String(text || "").toLowerCase();
	const decisionSlugs = new Set(terms.decision_tag.map((item) => item.slug));
	const mechanicSlugs = new Set(terms.mechanic.map((item) => item.slug));

	if (
		source.includes("near-zero prep") ||
		source.includes("zero prep") ||
		source.includes("no prep")
	) {
		return "none";
	}
	if (
		source.includes("low-to-medium prep") ||
		source.includes("low to medium prep") ||
		source.includes("medium prep")
	) {
		return "medium";
	}
	if (source.includes("high prep") || source.includes("heavy prep")) {
		return "high";
	}
	if (
		source.includes("very low prep") ||
		source.includes("low prep") ||
		source.includes("light prep") ||
		decisionSlugs.has("low-prep")
	) {
		return "low";
	}
	if (
		mechanicSlugs.has("rules-lite") ||
		mechanicSlugs.has("streamlined") ||
		normalizeBoolean(game.one_shot_friendly) ||
		normalizeBoolean(game.solo_friendly)
	) {
		return "low";
	}
	return "medium";
}

function inferGmRequired(text, game) {
	const source = String(text || "").toLowerCase();
	if (
		(normalizeBoolean(game.solo_friendly) && game.min_players === 1 && game.max_players === 1) ||
		GM_LESS_TEXT_PATTERN.test(source) ||
		source.includes("solo journaling")
	) {
		return false;
	}
	return true;
}

function deriveCoreMetadata(game, terms) {
	const source = sourceBlob(game);
	const next = {};
	const inferredPlayers = inferPlayerRange(source, game, terms);

	if (game.min_players == null && inferredPlayers.minPlayers != null)
		next.min_players = inferredPlayers.minPlayers;
	if (game.max_players == null && inferredPlayers.maxPlayers != null)
		next.max_players = inferredPlayers.maxPlayers;

	const inferredGmRequired = inferGmRequired(source, {
		...game,
		min_players: next.min_players ?? game.min_players,
		max_players: next.max_players ?? game.max_players,
	});
	if (
		game.gm_required == null ||
		(game.gm_required !== (inferredGmRequired ? 1 : 0) && GM_LESS_TEXT_PATTERN.test(source))
	) {
		next.gm_required = inferredGmRequired ? 1 : 0;
	}

	if (game.prep_level == null) {
		next.prep_level = inferPrepLevel(source, game, terms);
	}

	const inferredSession = inferSessionRange(source, game);
	if (game.session_length_minutes_min == null) {
		next.session_length_minutes_min = inferredSession.sessionMin;
	}
	if (game.session_length_minutes_max == null) {
		next.session_length_minutes_max = inferredSession.sessionMax;
	}

	return next;
}

function generationSource(game) {
	return String(game.body_html || game.review_summary || game.blurb || "")
		.replace(LEADING_AT_A_GLANCE_HTML_PATTERN, "")
		.replace(LEADING_AT_A_GLANCE_TEXT_PATTERN, "")
		.replace(LEADING_INLINE_AT_A_GLANCE_PATTERN, "")
		.replace(HTML_H2_PATTERN, " ");
}

function cleanupGeneratedSentence(sentence) {
	return sentence
		.replace(LEADING_GENERATED_AT_A_GLANCE_PATTERN, "")
		.replace(STRUCTURED_HEADING_TEXT_PATTERN, "")
		.replace(LEGACY_SENTENCE_LABEL_PATTERN, "")
		.trim();
}

const genreBestFor = {
	fantasy: "Groups that want fantasy adventure with a clear play identity",
	"dark-fantasy": "Groups that want fantasy with more danger, grime, or moral pressure",
	"high-fantasy": "Players who want larger-than-life fantasy adventure and magical stakes",
	cyberpunk: "Tables that want future pressure, technology, and social decay in play",
	horror: "Groups that want tension, danger, and unease to stay active at the table",
	"science-fiction": "Players who want science-fiction ideas to shape the actual play experience",
	"post-apocalyptic": "Groups that want life after collapse to drive the tone and choices",
	superheroes: "Tables that want comic-book action and larger-than-life character concepts",
	"space-opera": "Groups that want broad, adventurous science-fiction with crew or faction energy",
	"urban-fantasy": "Players who want supernatural pressure inside a recognizably modern world",
	romance: "Groups that want relationships and emotional entanglement to matter in play",
	historical: "Tables that want history or historical texture to shape the campaign",
	western: "Players who want frontier pressure, travel, and local conflict to matter",
	steampunk: "Groups that want industrial-fantasy style and machinery in the foreground",
	aliens: "Players who want hostile encounters with alien life and worlds",
	mystery: "Groups that want discovery, clues, and uncertainty to drive sessions",
	supernatural: "Tables that want hidden powers, uncanny threats, and eerie pressure",
	comedy: "Groups that want tone, absurdity, and momentum rather than solemn genre play",
};

const mechanicBestFor = {
	"narrative-driven": "Tables that want fiction-first play and scene-level consequences",
	"tactical-combat": "Groups that want combat choices and danger to matter mechanically",
	tactical: "Players who want sharper encounter decisions than a loose story game gives them",
	campaign: "Long-form play with room for characters and situations to develop",
	"one-shot-friendly": "Short arcs or standalone sessions with a strong premise",
	"team-based": "Groups that want ensemble play with complementary roles",
	investigation: "Tables that want solving problems and following clues to matter",
	sandbox: "Players who want open-ended exploration and self-directed problem-solving",
	"exploration-driven": "Groups that want place, travel, and discovery to stay central",
	"rules-lite": "Tables that want quick onboarding and low mechanical drag",
	streamlined: "Groups that want the system to stay fast and out of the way",
	"social-intrigue": "Players who want status, leverage, and conversation to matter",
	"character-customization":
		"Tables that enjoy tuning characters and expressing concepts mechanically",
	"resource-management": "Groups that want scarcity, logistics, or survival pressure to matter",
	universal: "Tables that want a flexible chassis instead of a tightly fixed setting",
	"collaborative-worldbuilding": "Groups that want to help shape the setting as part of play",
	"real-time-mechanics": "Players who want urgency and time pressure to change how sessions feel",
};

const systemBestFor = {
	"powered-by-the-apocalypse-pbta": "Groups already comfortable with fiction-first move-based play",
	"old-school-renaissance-osr":
		"Players who enjoy danger, discovery, and player-driven problem-solving",
	"forged-in-the-dark": "Tables that like pressure, teamwork, and consequence-forward mission play",
	"forged-in-the-dark-fitd":
		"Tables that like pressure, teamwork, and consequence-forward mission play",
	"year-zero-engine":
		"Groups that want streamlined procedures with strong survival or exploration texture",
	"new-school-revolution":
		"Players who want lighter, stranger, more sharply authored old-school play",
	"d20-system": "Groups comfortable with d20-style fantasy or adventure conventions",
};

const genreAvoid = {
	"dark-fantasy": "You want a lighter or more openly heroic tone",
	horror: "You want low-tension or low-threat play",
	"post-apocalyptic": "You want a cleaner, less pressured world state",
	cyberpunk: "You want a clean heroic future without systemic pressure",
	romance: "You want relationships and vulnerability kept mostly offscreen",
	superheroes: "You want grounded low-power realism instead of comic-book scale",
	universal: "You want a tightly authored setting handed to the table out of the box",
};

function taxonomyMap(rows) {
	const map = new Map();
	for (const row of rows) {
		const bucket = map.get(row.entry_id) || {
			genre: [],
			mechanic: [],
			system: [],
			theme: [],
			decision_tag: [],
		};
		bucket[row.name]?.push({ slug: row.term_slug, label: row.label });
		map.set(row.entry_id, bucket);
	}
	return map;
}

function firstLabel(group, fallback = null) {
	return group?.[0]?.label || fallback;
}

function firstSlug(group) {
	return group?.[0]?.slug || null;
}

function sourceText(game) {
	return stripHtml(game.body_html || game.review_summary || game.blurb || "");
}

function deriveAtAGlance(game, terms) {
	const parts = [];
	const primary = firstLabel(terms.genre) || firstLabel(terms.system) || firstLabel(terms.mechanic);
	if (primary) parts.push(primary);

	const source = sourceText(game).toLowerCase();
	if (parts.length === 0) {
		if (source.includes("solo")) parts.push("Solo");
		else if (source.includes("gm-less") || source.includes("gm less")) parts.push("GM-less");
		else if (source.includes("survival")) parts.push("Survival");
		else if (source.includes("map-drawing")) parts.push("Map-drawing");
		else if (source.includes("journaling")) parts.push("Journaling");
		else if (source.includes("urban fantasy")) parts.push("Urban Fantasy");
	}

	const minPlayers = typeof game.min_players === "number" ? game.min_players : null;
	const maxPlayers = typeof game.max_players === "number" ? game.max_players : null;
	if (minPlayers && maxPlayers) {
		parts.push(`${minPlayers}-${maxPlayers} players`);
	} else if (minPlayers) {
		parts.push(`${minPlayers}+ players`);
	} else if (maxPlayers) {
		parts.push(`Up to ${maxPlayers} players`);
	} else if (source.includes("solo")) {
		parts.push("1 player");
	}

	if (normalizeBoolean(game.gm_required)) {
		parts.push(game.gm_role_label ? `Needs ${game.gm_role_label}` : "Needs GM");
	} else if (source.includes("gm-less") || source.includes("gm less")) {
		parts.push("GM-less");
	}

	if (typeof game.complexity_score === "number") {
		parts.push(`${game.complexity_score}/5 complexity`);
	}

	if (normalizeBoolean(game.one_shot_friendly) && normalizeBoolean(game.campaign_friendly)) {
		parts.push("One-shots or campaigns");
	} else if (normalizeBoolean(game.one_shot_friendly)) {
		parts.push("One-shot friendly");
	} else if (normalizeBoolean(game.campaign_friendly)) {
		parts.push("Campaign friendly");
	}

	if (game.prep_level) {
		parts.push(`${humanizeSlug(game.prep_level)} prep`);
	} else if (
		source.includes("near-zero prep") ||
		source.includes("zero prep") ||
		source.includes("low prep")
	) {
		parts.push("Low prep");
	}

	return parts.slice(0, 5).join(" • ");
}

function deriveScores(game, terms) {
	let complexity = typeof game.complexity_score === "number" ? game.complexity_score : 3;
	let newGm = typeof game.new_gm_friendly === "number" ? game.new_gm_friendly : 3;
	let roleplay = typeof game.roleplay_focus === "number" ? game.roleplay_focus : 3;
	let combat = typeof game.combat_focus === "number" ? game.combat_focus : 2;
	let tactical = typeof game.tactical_depth === "number" ? game.tactical_depth : 2;
	let campaign = typeof game.campaign_depth === "number" ? game.campaign_depth : 3;

	const mechanicSlugs = new Set(terms.mechanic.map((item) => item.slug));
	const systemSlugs = new Set(terms.system.map((item) => item.slug));
	const genreSlugs = new Set(terms.genre.map((item) => item.slug));
	const decisionSlugs = new Set(terms.decision_tag.map((item) => item.slug));
	const themeSlugs = new Set(terms.theme.map((item) => item.slug));

	if (mechanicSlugs.has("rules-lite") || mechanicSlugs.has("streamlined")) {
		complexity -= 1;
		newGm += 1;
		tactical -= 1;
	}
	if (
		mechanicSlugs.has("tactical-combat") ||
		mechanicSlugs.has("tactical") ||
		mechanicSlugs.has("character-customization") ||
		mechanicSlugs.has("skill-based")
	) {
		complexity += 1;
		combat += 1;
		tactical += 2;
		newGm -= 1;
	}
	if (mechanicSlugs.has("campaign")) {
		campaign += 1;
		newGm -= 1;
	}
	if (mechanicSlugs.has("narrative-driven") || mechanicSlugs.has("social-intrigue")) {
		roleplay += 2;
		tactical -= 1;
	}
	if (mechanicSlugs.has("investigation")) {
		roleplay += 1;
		campaign += 1;
	}
	if (mechanicSlugs.has("sandbox") || mechanicSlugs.has("exploration-driven")) {
		campaign += 1;
		newGm -= 1;
	}
	if (mechanicSlugs.has("resource-management") || mechanicSlugs.has("survival")) {
		complexity += 1;
		tactical += 1;
	}
	if (mechanicSlugs.has("universal")) {
		complexity += 1;
		newGm -= 1;
	}

	if (systemSlugs.has("old-school-renaissance-osr")) {
		complexity += 1;
		newGm -= 1;
		combat += 1;
	}
	if (systemSlugs.has("powered-by-the-apocalypse-pbta")) {
		complexity -= 1;
		roleplay += 1;
		newGm += 1;
	}
	if (systemSlugs.has("forged-in-the-dark") || systemSlugs.has("forged-in-the-dark-fitd")) {
		complexity += 1;
		roleplay += 1;
		tactical += 1;
	}
	if (systemSlugs.has("year-zero-engine")) {
		newGm += 1;
	}
	if (systemSlugs.has("d20-system")) {
		complexity += 1;
		combat += 1;
		tactical += 1;
	}

	if (genreSlugs.has("romance")) roleplay += 2;
	if (genreSlugs.has("superheroes")) combat += 1;
	if (genreSlugs.has("horror")) roleplay += 1;
	if (genreSlugs.has("cyberpunk")) roleplay += 1;
	if (genreSlugs.has("science-fiction")) campaign += 1;
	if (genreSlugs.has("post-apocalyptic")) campaign += 1;
	if (genreSlugs.has("dark-fantasy")) combat += 1;
	if (genreSlugs.has("space-opera")) campaign += 1;

	if (decisionSlugs.has("beginner-friendly")) newGm += 1;
	if (decisionSlugs.has("low-prep")) newGm += 1;
	if (decisionSlugs.has("one-shot-friendly")) campaign -= 1;
	if (decisionSlugs.has("rules-medium")) complexity += 1;

	if (themeSlugs.has("cinematic")) tactical -= 1;
	if (themeSlugs.has("mature")) newGm -= 1;

	return {
		complexity: clamp(Math.round(complexity), 1, 5),
		newGm: clamp(Math.round(newGm), 1, 5),
		roleplay: clamp(Math.round(roleplay), 1, 5),
		combat: clamp(Math.round(combat), 1, 5),
		tactical: clamp(Math.round(tactical), 0, 5),
		campaign: clamp(Math.round(campaign), 1, 5),
	};
}

function deriveBestFor(game, terms, scores) {
	const items = [];
	const primaryGenre = firstSlug(terms.genre);
	const primarySystem = firstSlug(terms.system);
	const source = sourceText(game).toLowerCase();

	uniquePush(items, genreBestFor[primaryGenre] || null);

	for (const term of terms.mechanic) {
		uniquePush(items, mechanicBestFor[term.slug] || null);
		if (items.length >= 2) break;
	}

	uniquePush(items, systemBestFor[primarySystem] || null);

	if (scores.roleplay >= 4 && scores.combat <= 2) {
		uniquePush(
			items,
			"Players who want character, atmosphere, or story to matter more than pure tactics",
		);
	}
	if (scores.combat >= 4) {
		uniquePush(items, "Groups that want action and conflict to stay central to the session");
	}
	if (scores.campaign >= 4) {
		uniquePush(items, "Long-form campaigns with room for the table to build momentum");
	}
	if (normalizeBoolean(game.one_shot_friendly)) {
		uniquePush(items, "Groups that want a game that can land well in a single sitting");
	}
	if (normalizeBoolean(game.solo_friendly)) {
		uniquePush(items, "Solo players who want a self-guided tabletop experience");
	}

	if (source.includes("solo")) {
		uniquePush(items, "Solo players who want a focused self-guided experience");
	}
	if (source.includes("journaling")) {
		uniquePush(items, "Players who enjoy reflective journaling or diary-style play");
	}
	if (source.includes("gm-less") || source.includes("gm less") || source.includes("map-drawing")) {
		uniquePush(items, "Groups that want collaborative play without a traditional GM");
	}
	if (source.includes("survival")) {
		uniquePush(items, "Tables that want pressure, scarcity, and endurance to matter");
	}
	if (source.includes("urban fantasy")) {
		uniquePush(items, "Groups that want supernatural pressure inside a modern setting");
	}

	const fallback = [
		"Groups that want a game with a clear premise and a specific tone",
		"Tables that want the rules to reinforce the fiction instead of competing with it",
		"Players who want a game with a distinct play loop rather than a generic chassis",
	];
	for (const item of fallback) {
		uniquePush(items, item);
		if (items.length >= 3) break;
	}

	return items.slice(0, 3);
}

function deriveAvoidIf(game, terms, scores) {
	const items = [];
	const primaryGenre = firstSlug(terms.genre);
	const mechanicSlugs = new Set(terms.mechanic.map((item) => item.slug));

	if (scores.complexity >= 4) uniquePush(items, "You want a very light rules load");
	if (scores.complexity <= 2)
		uniquePush(items, "You want denser mechanical crunch or build complexity");
	if (scores.tactical >= 4)
		uniquePush(items, "You dislike tactical combat or heavier encounter procedure");
	if (scores.roleplay >= 4 && scores.combat <= 2) {
		uniquePush(items, "You want combat and action to drive most of the session");
	}
	if (scores.combat >= 4 && scores.roleplay <= 2) {
		uniquePush(items, "You want play to stay mostly social, introspective, or freeform");
	}
	if (scores.campaign >= 4 && !normalizeBoolean(game.one_shot_friendly)) {
		uniquePush(items, "You mainly want short standalone sessions with minimal carryover");
	}
	if (normalizeBoolean(game.one_shot_friendly) && scores.campaign <= 2) {
		uniquePush(items, "You want a giant long-form campaign engine");
	}
	if (game.content_intensity === "high") {
		uniquePush(items, "You want lower-intensity subject matter or a lighter emotional load");
	}
	if (game.prep_level === "high") {
		uniquePush(items, "You want near-zero prep and immediate pickup play");
	}
	if (genreAvoid[primaryGenre]) uniquePush(items, genreAvoid[primaryGenre]);
	if (mechanicSlugs.has("universal")) {
		uniquePush(items, "You want a strongly authored default world instead of a flexible framework");
	}

	const fallback = [
		"You want the system to stay almost invisible at the table",
		"You want a much breezier tone than this game is built to support",
		"You want the rules to solve every table decision for you",
	];
	for (const item of fallback) {
		uniquePush(items, item);
		if (items.length >= 3) break;
	}

	return items.slice(0, 3);
}

function fragmentFromRecommendation(text) {
	let result = String(text);
	for (const pattern of RECOMMENDATION_PREFIX_PATTERNS) {
		result = result.replace(pattern, "");
	}
	return lowerFirst(result);
}

function deriveWhyItFits(game, terms, bestFor) {
	const primaryGenre =
		firstLabel(terms.genre) || firstLabel(terms.system) || firstLabel(terms.mechanic);
	const primaryMechanic =
		firstLabel(terms.mechanic) || firstLabel(terms.system) || firstLabel(terms.theme);
	const fragment = bestFor[0] ? fragmentFromRecommendation(bestFor[0]) : null;

	if (fragment && primaryMechanic) {
		return `A strong fit for groups that want ${fragment}, with ${lowerFirst(primaryMechanic)} helping define the experience.`;
	}
	if (fragment) return `A strong fit for groups that want ${fragment}.`;
	if (primaryGenre && primaryMechanic) {
		return `A strong fit for groups that want ${lowerFirst(primaryGenre)} with ${lowerFirst(primaryMechanic)} at the table.`;
	}
	if (primaryGenre)
		return `A strong fit for groups that want ${lowerFirst(primaryGenre)} play with a clear point of view.`;
	return `A strong fit for groups that want a game with a clear tone and a specific play identity.`;
}

function cleanupWhyItFits(value, replacement) {
	const text = String(value || "").trim();
	if (!text) return replacement;
	if (WHY_NEEDS_REWRITE_PATTERN.test(text)) return replacement;
	return text;
}

function paragraph(text) {
	return `<p>${text}</p>`;
}

function generateStructuredBody(game, terms, bestFor, avoidIf) {
	const title = titleWithoutReviewSuffix(game.title);
	const primaryGenre = firstLabel(terms.genre) || "tabletop";
	const primarySystem = firstLabel(terms.system);
	const primaryMechanic = firstLabel(terms.mechanic);
	const sourceSentences = splitSentences(generationSource(game))
		.map(cleanupGeneratedSentence)
		.filter((sentence) => sentence && sentence.length > 20);
	const introSource = sourceSentences.slice(0, 2);
	const introText =
		introSource.join(" ") ||
		`${title} is a ${lowerFirst(primaryGenre)} RPG with a clear play identity and enough texture to stand apart from generic alternatives.`;

	const themeSource = sourceSentences.slice(2, 4).join(" ");
	const themeText =
		themeSource ||
		(game.blurb
			? `${title} is built around ${stripHtml(game.blurb).replace(TRAILING_PERIOD_PATTERN, "")}. ${primaryGenre !== "tabletop" ? `Its strongest thematic signal is ${lowerFirst(primaryGenre)} play.` : ""}`.trim()
			: `${title} works best when the table leans into its setting, tone, and the pressure points that make the premise distinct.`);

	const playSource = sourceSentences.slice(4, 6).join(" ");
	const playText =
		playSource ||
		`${bestFor[0] || "It works best for groups that want a clear play loop."} ${
			primarySystem ? `${primarySystem} shapes how the table moves from scene to scene.` : ""
		} ${primaryMechanic ? `${primaryMechanic} helps determine what gets emphasized in play.` : ""}`.trim();

	const distinctSource = sourceSentences.slice(6, 8).join(" ");
	const distinctText =
		distinctSource ||
		`${title} stands out because it is not trying to be an all-purpose genre game. ${
			game.review_summary
				? splitSentences(game.review_summary)[0] || ""
				: "Its strengths come from committing to a specific tone and set of play priorities."
		}`.trim();

	const notFitText = `${avoidIf[0] || "It will not fit every group equally well."} ${
		avoidIf[1] ? `${avoidIf[1]}.` : ""
	}`.trim();
	const dedupedThemeText = themeText.replace(DUPLICATED_THEME_PREFIX_PATTERN, "$1 is ");

	return [
		paragraph(introText),
		"<h2>Theme and Setting</h2>",
		paragraph(dedupedThemeText),
		"<h2>How Play Feels</h2>",
		paragraph(playText),
		"<h2>What Makes It Distinct</h2>",
		paragraph(distinctText),
		"<h2>Where It May Not Fit</h2>",
		paragraph(notFitText),
	].join("");
}

function normalizeBody(body, game, terms, bestFor, avoidIf) {
	const source = String(body || "").trim();
	const hasHeadings = H2_PATTERN.test(source);
	const hasRequiredHeadings = hasStructuredBodyHeadings(source);
	const hasLeadingAtAGlance = LEADING_INLINE_AT_A_GLANCE_PATTERN.test(source);
	const hasLegacyInlineLabels = LEGACY_INLINE_SECTION_LABEL_PATTERN.test(source);

	if (
		!source ||
		!hasHeadings ||
		!hasRequiredHeadings ||
		hasLegacyInlineLabels ||
		source.length < MIN_STRUCTURED_BODY_LENGTH
	) {
		return generateStructuredBody(game, terms, bestFor, avoidIf);
	}

	let normalized = source;
	normalized = normalized.replace(LEADING_AT_A_GLANCE_HTML_PATTERN, "");
	normalized = normalized.replace(LEADING_AT_A_GLANCE_TEXT_PATTERN, "");
	if (hasLeadingAtAGlance) {
		normalized = normalized.replace(LEADING_INLINE_AT_A_GLANCE_PATTERN, "");
	}
	normalized = normalized.replace(BOTTOM_LINE_SECTION_PATTERN, "");
	normalized = normalized.replace(LOSE_PEOPLE_HEADING_PATTERN, "<h2>Where It May Not Fit</h2>");
	normalized = normalized.replace(MAY_NOT_LAND_HEADING_PATTERN, "<h2>Where It May Not Fit</h2>");
	normalized = normalized.replace(LOSES_READERS_HEADING_PATTERN, "<h2>Where It May Not Fit</h2>");
	for (const [pattern, replacement] of HEADING_NORMALIZATION_PATTERNS) {
		normalized = normalized.replace(pattern, replacement);
	}

	for (const [pattern, replacement] of BODY_REPLACEMENTS) {
		normalized = normalized.replace(pattern, replacement);
	}

	normalized = normalized.replace(EXCESS_NEWLINES_PATTERN, "\n\n").trim();
	return normalized;
}

const backupPath = backupDatabase();

const games = runJson(`
	SELECT
		id,
		slug,
		title,
		status,
		deleted_at,
		blurb,
		review_summary,
		body_html,
		at_a_glance,
		best_for,
		avoid_if,
		why_it_fits,
		min_players,
		max_players,
		gm_required,
		gm_role_label,
		prep_level,
		session_length_minutes_min,
		session_length_minutes_max,
		complexity_score,
		new_gm_friendly,
		roleplay_focus,
		combat_focus,
		tactical_depth,
		campaign_depth,
		one_shot_friendly,
		campaign_friendly,
		solo_friendly,
		beginner_friendly,
		content_intensity
	FROM ec_games
	WHERE status = 'published' AND deleted_at IS NULL
	ORDER BY slug;
`);

const taxonomyRows = runJson(`
	SELECT ct.entry_id, t.name, t.slug AS term_slug, t.label
	FROM content_taxonomies ct
	JOIN taxonomies t ON t.id = ct.taxonomy_id
	WHERE ct.collection = 'games';
`);
const taxonomiesByEntry = taxonomyMap(taxonomyRows);

const statements = ["BEGIN IMMEDIATE;"];
let updatedAtAGlance = 0;
let updatedScores = 0;
let updatedRecommendations = 0;
let updatedBodies = 0;
let touchedRows = 0;

for (const game of games) {
	const terms = taxonomiesByEntry.get(game.id) || {
		genre: [],
		mechanic: [],
		system: [],
		theme: [],
		decision_tag: [],
	};

	const coreMetadata = deriveCoreMetadata(game, terms);
	const enrichedGame = { ...game, ...coreMetadata };
	const scores = deriveScores(enrichedGame, terms);
	const existingBestFor = parseJsonList(game.best_for);
	const existingAvoidIf = parseJsonList(game.avoid_if);

	const derivedAtAGlance = deriveAtAGlance(enrichedGame, terms);
	const nextAtAGlance = shouldRewriteAtAGlance(game.at_a_glance)
		? derivedAtAGlance
		: game.at_a_glance.trim();
	const nextBestFor =
		existingBestFor.length > 0 ? existingBestFor : deriveBestFor(enrichedGame, terms, scores);
	const nextAvoidIf =
		existingAvoidIf.length > 0 ? existingAvoidIf : deriveAvoidIf(enrichedGame, terms, scores);
	const nextWhyItFits = cleanupWhyItFits(
		game.why_it_fits,
		deriveWhyItFits(enrichedGame, terms, nextBestFor),
	);
	const nextBody = normalizeBody(game.body_html, enrichedGame, terms, nextBestFor, nextAvoidIf);

	const updates = {};

	for (const [field, value] of Object.entries(coreMetadata)) {
		if (value != null && game[field] !== value) {
			updates[field] = value;
		}
	}

	if ((game.at_a_glance || "").trim() !== nextAtAGlance) {
		updates.at_a_glance = nextAtAGlance;
		updatedAtAGlance += 1;
	}

	if (
		game.best_for == null ||
		game.best_for === "" ||
		game.best_for === "[]" ||
		existingBestFor.length === 0
	) {
		updates.best_for = JSON.stringify(nextBestFor.map((text) => ({ text })));
		updatedRecommendations += 1;
	}

	if (
		game.avoid_if == null ||
		game.avoid_if === "" ||
		game.avoid_if === "[]" ||
		existingAvoidIf.length === 0
	) {
		updates.avoid_if = JSON.stringify(nextAvoidIf.map((text) => ({ text })));
		updatedRecommendations += 1;
	}

	if ((game.why_it_fits || "").trim() !== nextWhyItFits) {
		updates.why_it_fits = nextWhyItFits;
		updatedRecommendations += 1;
	}

	if ((game.body_html || "").trim() !== nextBody) {
		updates.body_html = nextBody;
		updatedBodies += 1;
	}

	const scoreFields = {
		complexity_score: scores.complexity,
		new_gm_friendly: scores.newGm,
		roleplay_focus: scores.roleplay,
		combat_focus: scores.combat,
		tactical_depth: scores.tactical,
		campaign_depth: scores.campaign,
	};
	for (const [field, value] of Object.entries(scoreFields)) {
		if (game[field] == null) {
			updates[field] = value;
			updatedScores += 1;
		}
	}

	const updateEntries = Object.entries(updates);
	if (updateEntries.length === 0) continue;
	touchedRows += 1;
	statements.push(
		`UPDATE ec_games SET ${updateEntries.map(([field, value]) => `${field} = ${sqlString(value)}`).join(", ")} WHERE id = ${sqlString(game.id)};`,
	);
}

statements.push("COMMIT;");
runSql(statements.join("\n"));

const summary = {
	backupPath,
	publishedGames: games.length,
	touchedRows,
	updatedAtAGlance,
	updatedScores,
	updatedRecommendations,
	updatedBodies,
};

console.log(JSON.stringify(summary, null, 2));
