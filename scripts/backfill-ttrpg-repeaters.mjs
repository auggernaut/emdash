import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { parseArgs } from "node:util";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultDatabasePath = path.join(rootDir, "sites/ttrpg-games/data.db");
const requireFromSite = createRequire(path.join(rootDir, "sites/ttrpg-games/package.json"));
const BetterSqlite3 = requireFromSite("better-sqlite3");

const FIELD_CONFIGS = [
	{
		collection: "games",
		slug: "best_for",
		type: "repeater",
		widget: null,
		validation: {
			subFields: [{ slug: "text", type: "string", label: "Text", required: true }],
		},
	},
	{
		collection: "games",
		slug: "avoid_if",
		type: "repeater",
		widget: null,
		validation: {
			subFields: [{ slug: "text", type: "string", label: "Text", required: true }],
		},
	},
	{
		collection: "category_pages",
		slug: "faqs",
		type: "repeater",
		widget: null,
		validation: {
			subFields: [
				{ slug: "question", type: "string", label: "Question", required: true },
				{ slug: "answer", type: "text", label: "Answer", required: true },
			],
		},
	},
	{
		collection: "category_pages",
		slug: "related_categories",
		type: "repeater",
		widget: null,
		validation: {
			subFields: [
				{ slug: "slug", type: "string", label: "Category Slug", required: true },
				{ slug: "reason", type: "text", label: "Reason" },
			],
		},
	},
];

function pad(value) {
	return String(value).padStart(2, "0");
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

function parseJsonValue(rawValue) {
	if (typeof rawValue !== "string" || rawValue.trim() === "") return null;

	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function normalizeTextRepeaterItems(rawValue) {
	const parsed = parseJsonValue(rawValue);
	if (!Array.isArray(parsed)) return null;

	return parsed
		.map((item) => {
			if (typeof item === "string") return item.trim();
			if (
				typeof item === "object" &&
				item !== null &&
				"text" in item &&
				typeof item.text === "string"
			) {
				return item.text.trim();
			}
			return "";
		})
		.filter(Boolean)
		.map((text) => ({ text }));
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
	},
});

const databasePath = path.resolve(values.database);

if (!fs.existsSync(databasePath)) {
	console.error(`Database not found: ${databasePath}`);
	process.exit(1);
}

if (!values["dry-run"]) {
	const backupPath = backupDatabase(databasePath);
	console.log(`Backup created at ${backupPath}`);
}

const db = new BetterSqlite3(databasePath);
db.pragma("journal_mode = WAL");

const updateField = db.prepare(`
	UPDATE _emdash_fields
	SET
		type = @type,
		column_type = 'JSON',
		validation = @validation,
		widget = @widget
	WHERE collection_id = (
		SELECT id FROM _emdash_collections WHERE slug = @collection
	)
	AND slug = @slug
`);

const getGamesWithRecommendations = db.prepare(`
	SELECT id, slug, best_for, avoid_if
	FROM ec_games
	WHERE deleted_at IS NULL
`);

const updateGameRecommendations = db.prepare(`
	UPDATE ec_games
	SET
		best_for = @best_for,
		avoid_if = @avoid_if
	WHERE id = @id
`);

const summary = {
	database: databasePath,
	dryRun: values["dry-run"],
	fieldDefinitionsUpdated: 0,
	gameRecommendationRowsUpdated: 0,
};

const applyBackfill = db.transaction(() => {
	for (const field of FIELD_CONFIGS) {
		if (!values["dry-run"]) {
			updateField.run({
				collection: field.collection,
				slug: field.slug,
				type: field.type,
				validation: JSON.stringify(field.validation),
				widget: field.widget,
			});
		}
		summary.fieldDefinitionsUpdated += 1;
	}

	for (const game of getGamesWithRecommendations.all()) {
		const normalizedBestFor = normalizeTextRepeaterItems(game.best_for);
		const normalizedAvoidIf = normalizeTextRepeaterItems(game.avoid_if);

		if (!normalizedBestFor && !normalizedAvoidIf) continue;

		const nextBestFor =
			normalizedBestFor !== null ? JSON.stringify(normalizedBestFor) : game.best_for;
		const nextAvoidIf =
			normalizedAvoidIf !== null ? JSON.stringify(normalizedAvoidIf) : game.avoid_if;

		if (nextBestFor === game.best_for && nextAvoidIf === game.avoid_if) continue;

		if (!values["dry-run"]) {
			updateGameRecommendations.run({
				id: game.id,
				best_for: nextBestFor,
				avoid_if: nextAvoidIf,
			});
		}
		summary.gameRecommendationRowsUpdated += 1;
	}
});

applyBackfill();
db.close();

console.log(JSON.stringify(summary, null, 2));
