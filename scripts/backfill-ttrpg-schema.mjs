import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";

import {
	FACET_TAXONOMIES,
	buildCategorySourceIndex,
	buildFacetAssignments,
	deriveGameFields,
} from "./ttrpg-schema-utils.mjs";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultDatabasePath = path.join(rootDir, "demos/ttrpg-games/data.db");
const categoriesCsvPath = path.join(rootDir, "ttrpg-categories.csv");
const requireFromDemo = createRequire(path.join(rootDir, "demos/ttrpg-games/package.json"));
const BetterSqlite3 = requireFromDemo("better-sqlite3");

function pad(value) {
	return String(value).padStart(2, "0");
}

const { values } = parseArgs({
	options: {
		database: {
			type: "string",
			default: defaultDatabasePath,
		},
		"dry-run": {
			type: "boolean",
			default: false,
		},
		overwrite: {
			type: "boolean",
			default: false,
		},
	},
});

function parseCsv(source) {
	const rows = [];
	let row = [];
	let cell = "";
	let inQuotes = false;

	for (let index = 0; index < source.length; index += 1) {
		const char = source[index];
		const next = source[index + 1];

		if (inQuotes) {
			if (char === '"' && next === '"') {
				cell += '"';
				index += 1;
				continue;
			}

			if (char === '"') {
				inQuotes = false;
				continue;
			}

			cell += char;
			continue;
		}

		if (char === '"') {
			inQuotes = true;
			continue;
		}

		if (char === ",") {
			row.push(cell);
			cell = "";
			continue;
		}

		if (char === "\n") {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = "";
			continue;
		}

		if (char === "\r") {
			continue;
		}

		cell += char;
	}

	if (cell.length > 0 || row.length > 0) {
		row.push(cell);
		rows.push(row);
	}

	return rows;
}

function rowsToObjects(rows) {
	const [headerRow, ...dataRows] = rows;
	const headers = headerRow.map((cell) => cell.trim());

	return dataRows
		.filter((row) => row.some((cell) => cell.trim() !== ""))
		.map((row) => {
			const record = {};
			headers.forEach((header, index) => {
				if (!header) return;
				record[header] = row[index] ?? "";
			});
			return record;
		});
}

function nowStamp() {
	const date = new Date();
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
		"-",
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds()),
	].join("");
}

function backupDatabase(databasePath) {
	const directory = path.dirname(databasePath);
	const backupsDir = path.join(directory, "backups");
	const baseName = path.basename(databasePath, path.extname(databasePath));
	const stamp = nowStamp();
	const backupPath = path.join(backupsDir, `${baseName}-${stamp}.db`);

	fs.mkdirSync(backupsDir, { recursive: true });
	fs.copyFileSync(databasePath, backupPath);

	for (const suffix of ["-wal", "-shm"]) {
		const sourcePath = `${databasePath}${suffix}`;
		if (fs.existsSync(sourcePath)) {
			fs.copyFileSync(sourcePath, `${backupPath}${suffix}`);
		}
	}

	return backupPath;
}

function isEmptyValue(value) {
	return value === null || value === undefined || value === "";
}

const databasePath = path.resolve(values.database);

if (!fs.existsSync(databasePath)) {
	console.error(`Database not found: ${databasePath}`);
	process.exit(1);
}

const categoryRows = rowsToObjects(parseCsv(fs.readFileSync(categoriesCsvPath, "utf8")));
const categorySourceBySlug = buildCategorySourceIndex(categoryRows);

if (!values["dry-run"]) {
	const backupPath = backupDatabase(databasePath);
	console.log(`Backup created at ${backupPath}`);
}

const db = new BetterSqlite3(databasePath);
db.pragma("journal_mode = WAL");

const taxonomyNames = FACET_TAXONOMIES.map((taxonomy) => taxonomy.name);
const taxonomyNameList = taxonomyNames.map(() => "?").join(", ");

const categoryLabelRows = db
	.prepare("SELECT slug, label FROM taxonomies WHERE name = 'category'")
	.all();
const categoryLabelBySlug = new Map(categoryLabelRows.map((row) => [row.slug, row.label]));

const taxonomyTermRows = db
	.prepare(`SELECT id, name, slug FROM taxonomies WHERE name IN (${taxonomyNameList})`)
	.all(...taxonomyNames);
const taxonomyTermsByName = new Map();

for (const taxonomyName of taxonomyNames) {
	taxonomyTermsByName.set(taxonomyName, new Map());
}

for (const row of taxonomyTermRows) {
	taxonomyTermsByName.get(row.name)?.set(row.slug, row.id);
}

const missingTaxonomies = taxonomyNames.filter((taxonomyName) => {
	const terms = taxonomyTermsByName.get(taxonomyName);
	return !terms || terms.size === 0;
});

if (missingTaxonomies.length > 0) {
	console.error(
		`Missing additive taxonomy terms for: ${missingTaxonomies.join(", ")}. Apply the updated seed first.`,
	);
	process.exit(1);
}

const getGameRows = db.prepare(`
	SELECT
		id,
		slug,
		body_html,
		at_a_glance,
		min_players,
		max_players,
		gm_required,
		gm_role_label,
		session_length_minutes_min,
		session_length_minutes_max,
		prep_level,
		one_shot_friendly,
		campaign_friendly,
		solo_friendly,
		beginner_friendly
	FROM ec_games
	WHERE deleted_at IS NULL
`);

const getCategorySlugs = db.prepare(`
	SELECT taxonomies.slug
	FROM content_taxonomies
	INNER JOIN taxonomies ON taxonomies.id = content_taxonomies.taxonomy_id
	WHERE content_taxonomies.collection = 'games'
		AND content_taxonomies.entry_id = ?
		AND taxonomies.name = 'category'
	ORDER BY taxonomies.slug ASC
`);

const deleteFacetAssignments = db.prepare(`
	DELETE FROM content_taxonomies
	WHERE collection = 'games'
		AND entry_id = ?
		AND taxonomy_id IN (
			SELECT id FROM taxonomies WHERE name = ?
		)
`);

const insertFacetAssignment = db.prepare(`
	INSERT OR IGNORE INTO content_taxonomies (collection, entry_id, taxonomy_id)
	VALUES ('games', ?, ?)
`);

const updateGame = db.prepare(`
	UPDATE ec_games
	SET
		at_a_glance = @at_a_glance,
		min_players = @min_players,
		max_players = @max_players,
		gm_required = @gm_required,
		gm_role_label = @gm_role_label,
		session_length_minutes_min = @session_length_minutes_min,
		session_length_minutes_max = @session_length_minutes_max,
		prep_level = @prep_level,
		one_shot_friendly = @one_shot_friendly,
		campaign_friendly = @campaign_friendly,
		solo_friendly = @solo_friendly,
		beginner_friendly = @beginner_friendly
	WHERE id = @id
`);

const games = getGameRows.all();
const summary = {
	games: games.length,
	fieldUpdates: 0,
	taxonomyResets: 0,
	taxonomyAssignments: 0,
};

const applyBackfill = db.transaction(() => {
	for (const game of games) {
		const categorySlugs = getCategorySlugs.all(game.id).map((row) => row.slug);
		const derivedFields = deriveGameFields({
			categorySlugs,
			bodyHtml: game.body_html ?? "",
		});
		const nextFields = { id: game.id };
		let hasFieldUpdate = false;

		for (const [key, value] of Object.entries(derivedFields)) {
			nextFields[key] = game[key];

			if (isEmptyValue(value)) continue;

			if (values.overwrite || isEmptyValue(game[key])) {
				nextFields[key] = typeof value === "boolean" ? Number(value) : value;
				hasFieldUpdate = true;
				continue;
			}
		}

		if (hasFieldUpdate && !values["dry-run"]) {
			updateGame.run(nextFields);
		}
		if (hasFieldUpdate) {
			summary.fieldUpdates += 1;
		}

		const facetAssignments = buildFacetAssignments(
			categorySlugs,
			categorySourceBySlug,
			categoryLabelBySlug,
		);

		for (const taxonomyName of taxonomyNames) {
			if (!values["dry-run"]) {
				deleteFacetAssignments.run(game.id, taxonomyName);
			}
			summary.taxonomyResets += 1;

			for (const slug of facetAssignments[taxonomyName] ?? []) {
				const taxonomyId = taxonomyTermsByName.get(taxonomyName)?.get(slug);
				if (!taxonomyId) continue;
				if (!values["dry-run"]) {
					insertFacetAssignment.run(game.id, taxonomyId);
				}
				summary.taxonomyAssignments += 1;
			}
		}
	}
});

applyBackfill();
db.close();

console.log(
	JSON.stringify(
		{
			database: databasePath,
			dryRun: values["dry-run"],
			overwrite: values.overwrite,
			...summary,
		},
		null,
		2,
	),
);
