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
const TRAILING_PERIOD_PATTERN = /\.$/;
const LONG_FORM_PREFIX_PATTERN = /^long-form\s+/i;
const BEST_FOR_PREFIX_PATTERNS = [
	/^groups that want\s+/i,
	/^tables that want\s+/i,
	/^players who want\s+/i,
	/^players who enjoy\s+/i,
	/^groups that enjoy\s+/i,
	/^groups that like\s+/i,
	/^tables that like\s+/i,
	/^long-form\s+/i,
];
const WHY_PREFIX_PATTERNS = [
	/^A strong fit for groups that want\s+/i,
	/^A strong fit for tables that want\s+/i,
	/^A strong fit for players who want\s+/i,
	/^A good fit for groups that want\s+/i,
	/^A good fit for tables that want\s+/i,
	/^A good fit for players who want\s+/i,
	/^A strong\s+/i,
	/^A good\s+/i,
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
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-category-fit-backfill.db`);
	fs.copyFileSync(databasePath, backupPath);
	for (const suffix of ["-wal", "-shm"]) {
		const sidecar = `${databasePath}${suffix}`;
		if (fs.existsSync(sidecar)) {
			fs.copyFileSync(sidecar, `${backupPath}${suffix}`);
		}
	}
	return backupPath;
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

function runSql(sql) {
	return execFileSync("sqlite3", [databasePath], {
		encoding: "utf8",
		input: sql,
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["pipe", "pipe", "pipe"],
	}).trim();
}

function sqlString(value) {
	if (value == null) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
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

function firstSentence(value) {
	const text = stripHtml(value);
	if (!text) return "";
	const parts = text.split(SENTENCE_SPLIT_PATTERN);
	return (parts[0] || text).trim();
}

function lowerFirst(value) {
	return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function sessionRange(game) {
	if (
		typeof game.session_length_minutes_min === "number" &&
		typeof game.session_length_minutes_max === "number"
	) {
		const minHours = Math.round((game.session_length_minutes_min / 60) * 10) / 10;
		const maxHours = Math.round((game.session_length_minutes_max / 60) * 10) / 10;
		if (minHours === maxHours) return `${minHours}h sessions`;
		return `${minHours}-${maxHours}h sessions`;
	}
	return null;
}

function prepPhrase(game) {
	if (!game.prep_level) return null;
	switch (game.prep_level) {
		case "none":
			return "near-zero prep";
		case "low":
			return "low prep";
		case "medium":
			return "moderate prep";
		case "high":
			return "higher prep";
		default:
			return `${game.prep_level} prep`;
	}
}

function bestForFragment(text) {
	if (!text) return "";
	let value = String(text).replace(LONG_FORM_PREFIX_PATTERN, "long-form ");
	for (const pattern of BEST_FOR_PREFIX_PATTERNS) {
		value = value.replace(pattern, "");
	}
	return value.replace(TRAILING_PERIOD_PATTERN, "").trim();
}

function whyFragment(text) {
	if (!text) return "";
	let value = String(text);
	for (const pattern of WHY_PREFIX_PATTERNS) {
		value = value.replace(pattern, "");
	}
	return value.replace(TRAILING_PERIOD_PATTERN, "").trim();
}

function genericReason(game) {
	const bestFor = parseJsonList(game.best_for);
	const why = whyFragment(game.why_it_fits);
	const bestForFirst = bestForFragment(bestFor[0]);
	const blurb = firstSentence(game.blurb);

	if (bestForFirst) return `it works best for ${bestForFirst}`;
	if (why) return lowerFirst(why);
	if (blurb) return lowerFirst(blurb).replace(TRAILING_PERIOD_PATTERN, "");
	return "the game has a clear identity at the table";
}

function buildDecisionBlurb(categorySlug, categoryLabel, game) {
	const label = categoryLabel.toLowerCase();
	const prep = prepPhrase(game);
	const sessions = sessionRange(game);
	const bestFor = parseJsonList(game.best_for);
	const best = bestForFragment(bestFor[0]) || genericReason(game);

	switch (categorySlug) {
		case "low-prep":
			return `A good low-prep choice because ${prep || "setup stays light"} and it gets to the table quickly.`;
		case "beginner-friendly":
			return `A good beginner-friendly pick because the core loop is readable and ${game.new_gm_friendly >= 4 ? "the game is forgiving for newer facilitators" : "new groups can get oriented without fighting the rules"}.`;
		case "one-shot-friendly":
			return `Fits one-shot-friendly play because ${sessions || "the structure resolves cleanly in a single sitting"} and the premise lands fast.`;
		case "collaborative":
			return `Belongs in collaborative play because the table is expected to contribute actively to scenes, tone, or world detail instead of leaving authorship to one person.`;
		case "free":
			return `A strong free option because there is no buy-in barrier and the game still gives a complete standalone experience.`;
		case "licensed":
			return `Fits licensed play because the recognizable setting is part of the appeal rather than just background flavor.`;
		case "rules-medium":
			return `A good rules-medium pick because it offers more structure than a rules-lite game without going all the way into heavy crunch.`;
		default:
			return `A good ${label} pick because ${best}.`;
	}
}

function buildMechanicBlurb(categorySlug, categoryLabel, game) {
	switch (categorySlug) {
		case "rules-lite":
			return `Fits rules-lite play because the system stays lean enough to move fast without dissolving into vagueness.`;
		case "narrative-driven":
			return `Belongs in narrative-driven play because character pressure, fiction, and scene consequences matter more than tactical procedure.`;
		case "survival":
			return `Fits survival play because scarcity, danger, and staying functional are part of the game’s ongoing pressure.`;
		case "exploration-driven":
			return `Belongs in exploration-driven play because place, travel, and discovery are central to the experience rather than incidental scenery.`;
		case "character-customization":
			return `Fits character customization because expressing a distinct build, role, or approach is part of the game’s appeal.`;
		case "resource-management":
			return `Belongs in resource-management play because supplies, endurance, or logistics materially change the table’s decisions.`;
		case "collaborative-worldbuilding":
			return `Fits collaborative worldbuilding because the table helps author the setting instead of just exploring a fixed one.`;
		case "classless":
			return `Belongs in classless play because character identity is built from choices, equipment, and fiction rather than locked class tracks.`;
		case "tactical-combat":
			return `Fits tactical combat because fight decisions carry real mechanical weight instead of staying purely descriptive.`;
		case "sandbox":
			return `Belongs in sandbox play because the group can choose direction, priorities, and goals without a single scripted path.`;
		case "team-based":
			return `Fits team-based play because the game assumes a crew, squad, or ensemble with complementary roles.`;
		case "solo-play":
			return `Belongs in solo play because one player can get a complete experience without needing a full group.`;
		case "streamlined":
			return `Fits streamlined play because the procedures stay focused and fast without a lot of subsystem drag.`;
		case "class-based":
			return `Belongs in class-based play because advancement and role identity are anchored in recognizable classes.`;
		case "gm-less":
			return `Fits GM-less play because the structure distributes authority across the table instead of relying on a dedicated referee.`;
		case "investigation":
			return `Belongs in investigation play because understanding the situation is as important as confronting it.`;
		case "campaign":
			return `Fits campaign play because the game has enough continuity, development, and escalation to reward longer arcs.`;
		default:
			return `Belongs in ${categoryLabel.toLowerCase()} play because ${genericReason(game)}.`;
	}
}

function buildSystemBlurb(categorySlug, categoryLabel) {
	switch (categorySlug) {
		case "old-school-renaissance-osr":
			return `Fits OSR play because danger, player judgment, and rulings-forward problem-solving matter more than carefully balanced outcomes.`;
		case "powered-by-the-apocalypse-pbta":
			return `Belongs in PbtA play because fiction-first moves and consequence-driven resolution shape the whole experience.`;
		case "forged-in-the-dark":
		case "forged-in-the-dark-fitd":
			return `Fits Forged in the Dark play because pressure, teamwork, and consequences do more work than simulation detail.`;
		case "year-zero-engine":
			return `Belongs in Year Zero play because the engine’s push-your-luck texture and clean procedures strongly shape the session feel.`;
		case "d20-system":
			return `Fits d20-system play because character options, resolution, and advancement all sit in recognizable d20 territory.`;
		case "new-school-revolution":
			return `Belongs in NSR play because it favors lighter, sharper, more authored old-school design over pure retro imitation.`;
		default:
			return `Fits ${categoryLabel} because the underlying engine materially shapes how the game feels at the table.`;
	}
}

function buildThemeBlurb(categorySlug, categoryLabel) {
	switch (categorySlug) {
		case "dark":
			return `Fits dark play because the tone stays harsh, uneasy, or morally pressured instead of breezy or cleanly heroic.`;
		case "bleak":
			return `Belongs in bleak play because hope is constrained and the world keeps pressure on the table.`;
		case "psychological":
			return `Fits psychological play because inner pressure, fear, obsession, or identity matter as much as external conflict.`;
		case "political":
			return `Belongs in political play because factions, leverage, and institutions shape the central conflicts.`;
		case "social-intrigue":
			return `Fits social intrigue because status, relationships, and maneuvering matter as much as overt confrontation.`;
		case "cinematic":
			return `Belongs in cinematic play because momentum, spectacle, and scene energy matter more than granular simulation.`;
		default:
			return `Fits ${categoryLabel.toLowerCase()} play because the tone and pressure stay pointed in that direction.`;
	}
}

function buildGenreBlurb(categorySlug, categoryLabel, game) {
	switch (categorySlug) {
		case "fantasy":
			return `Belongs in fantasy because magic, myth, and adventurous world logic materially shape the experience.`;
		case "science-fiction":
			return `Fits science fiction because technology, futurity, or alien worlds materially shape the setting and the decisions within it.`;
		case "horror":
			return `Belongs in horror because tension, vulnerability, and threat are part of how sessions are supposed to feel.`;
		case "dark-fantasy":
			return `Fits dark fantasy because the setting leans toward grime, dread, and compromised survival rather than clean heroic adventure.`;
		case "post-apocalyptic":
			return `Belongs in post-apocalyptic play because collapse, aftermath, and trying to function in a broken world are central to the premise.`;
		case "high-fantasy":
			return `Fits high fantasy because the scope, magic, and stakes run larger than grounded swords-and-sorcery adventure.`;
		case "aliens":
			return `Belongs here because alien life, alien worlds, or the pressure of nonhuman contact are central to what the game is doing.`;
		default:
			return `Fits ${categoryLabel.toLowerCase()} play because ${genericReason(game)}.`;
	}
}

function buildFitBlurb(category, game) {
	switch (category.source_taxonomy) {
		case "decision_tag":
			return buildDecisionBlurb(category.slug, category.term_label, game);
		case "mechanic":
			return buildMechanicBlurb(category.slug, category.term_label, game);
		case "system":
			return buildSystemBlurb(category.slug, category.term_label);
		case "theme":
			return buildThemeBlurb(category.slug, category.term_label);
		case "genre":
			return buildGenreBlurb(category.slug, category.term_label, game);
		default:
			return `Fits ${category.term_label.toLowerCase()} because ${genericReason(game)}.`;
	}
}

const backupPath = backupDatabase();

const categoryPages = runJson(`
	SELECT
		cp.id,
		cp.slug,
		cp.source_taxonomy,
		cp.source_term_slug,
		t.label AS term_label,
		cp.game_notes
	FROM ec_category_pages cp
	JOIN taxonomies t ON t.name = cp.source_taxonomy AND t.slug = cp.source_term_slug
	WHERE cp.status = 'published' AND cp.deleted_at IS NULL;
`);

const games = runJson(`
	SELECT
		g.id,
		g.slug,
		g.title,
		g.blurb,
		g.at_a_glance,
		g.best_for,
		g.avoid_if,
		g.why_it_fits,
		g.complexity_score,
		g.new_gm_friendly,
		g.roleplay_focus,
		g.combat_focus,
		g.tactical_depth,
		g.campaign_depth,
		g.min_players,
		g.max_players,
		g.gm_required,
		g.prep_level,
		g.session_length_minutes_min,
		g.session_length_minutes_max,
		g.solo_friendly,
		g.one_shot_friendly,
		g.campaign_friendly,
		g.beginner_friendly
	FROM ec_games g
	WHERE g.status = 'published' AND g.deleted_at IS NULL;
`);

const categoryAssignments = runJson(`
	SELECT
		cp.id AS category_page_id,
		g.slug AS game_slug
	FROM ec_category_pages cp
	JOIN taxonomies t ON t.name = cp.source_taxonomy AND t.slug = cp.source_term_slug
	JOIN content_taxonomies ct ON ct.taxonomy_id = t.id AND ct.collection = 'games'
	JOIN ec_games g ON g.id = ct.entry_id
	WHERE cp.status = 'published'
		AND cp.deleted_at IS NULL
		AND g.status = 'published'
		AND g.deleted_at IS NULL;
`);

const gamesBySlug = new Map(games.map((game) => [game.slug, game]));
const assignmentsByCategoryId = new Map();
for (const row of categoryAssignments) {
	const bucket = assignmentsByCategoryId.get(row.category_page_id) || [];
	bucket.push(row.game_slug);
	assignmentsByCategoryId.set(row.category_page_id, bucket);
}

const statements = ["BEGIN IMMEDIATE;"];
let updatedCategories = 0;
let addedNotes = 0;

for (const category of categoryPages) {
	const assignedGameSlugs = assignmentsByCategoryId.get(category.id) || [];
	if (assignedGameSlugs.length === 0) continue;

	const existingNotes = category.game_notes ? JSON.parse(category.game_notes) : [];
	const existingBySlug = new Map(
		existingNotes
			.map((note) => [note?.game_slug || note?.gameSlug || null, note])
			.filter(([slug]) => Boolean(slug)),
	);

	let changed = false;
	for (const gameSlug of assignedGameSlugs.toSorted()) {
		if (existingBySlug.has(gameSlug)) continue;
		const game = gamesBySlug.get(gameSlug);
		if (!game) continue;
		existingNotes.push({
			game_slug: gameSlug,
			fit_blurb: buildFitBlurb(category, game),
			featured: false,
			featured_reason: "",
			sort_order: null,
		});
		addedNotes += 1;
		changed = true;
	}

	if (!changed) continue;

	statements.push(
		`UPDATE ec_category_pages SET game_notes = ${sqlString(JSON.stringify(existingNotes))} WHERE id = ${sqlString(category.id)};`,
	);
	updatedCategories += 1;
}

statements.push("COMMIT;");
runSql(statements.join("\n"));

console.log(
	JSON.stringify(
		{
			backupPath,
			updatedCategories,
			addedNotes,
		},
		null,
		2,
	),
);
