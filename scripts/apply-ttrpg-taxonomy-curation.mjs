import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultDatabasePath = path.join(rootDir, "demos/ttrpg-games/data.db");

const CURATED_ASSIGNMENTS = {
	alienrpg: {
		genre: ["aliens"],
	},
	"arc-doom-tabletop-rpg": {
		mechanic: ["real-time-mechanics"],
	},
	bluebeardsbride: {
		theme: ["feminist"],
	},
	ladyblackbird: {
		genre: ["steampunk"],
	},
	shadowdark: {
		mechanic: ["real-time-mechanics"],
	},
	starwars: {
		genre: ["star-wars"],
	},
	vaesen: {
		genre: ["nordic-mythology"],
	},
};

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

function sqlString(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(databasePath, sql) {
	return execFileSync("sqlite3", [databasePath, sql], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function runJson(databasePath, sql) {
	const output = execFileSync("sqlite3", ["-json", databasePath, sql], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();

	if (!output) return [];

	return JSON.parse(output);
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

const summary = {
	database: databasePath,
	dryRun: values["dry-run"],
	added: [],
	skippedExisting: [],
};

const pendingInserts = [];

for (const [gameSlug, assignments] of Object.entries(CURATED_ASSIGNMENTS)) {
	const [game] = runJson(
		databasePath,
		[
			"SELECT id, slug, title",
			"FROM ec_games",
			`WHERE slug = ${sqlString(gameSlug)}`,
			"AND deleted_at IS NULL",
			"LIMIT 1;",
		].join(" "),
	);

	if (!game) {
		throw new Error(`Game not found: ${gameSlug}`);
	}

	for (const [taxonomyName, termSlugs] of Object.entries(assignments)) {
		for (const termSlug of termSlugs) {
			const [taxonomy] = runJson(
				databasePath,
				[
					"SELECT id, name, slug, label",
					"FROM taxonomies",
					`WHERE name = ${sqlString(taxonomyName)}`,
					`AND slug = ${sqlString(termSlug)}`,
					"LIMIT 1;",
				].join(" "),
			);

			if (!taxonomy) {
				throw new Error(`Taxonomy term not found: ${taxonomyName}/${termSlug}`);
			}

			const exists = runSql(
				databasePath,
				[
					"SELECT EXISTS(",
					"SELECT 1 FROM content_taxonomies",
					"WHERE collection = 'games'",
					`AND entry_id = ${sqlString(game.id)}`,
					`AND taxonomy_id = ${sqlString(taxonomy.id)}`,
					");",
				].join(" "),
			);

			if (exists === "1") {
				summary.skippedExisting.push({
					game: game.slug,
					taxonomy: taxonomy.name,
					term: taxonomy.slug,
				});
				continue;
			}

			pendingInserts.push({
				gameId: game.id,
				gameSlug: game.slug,
				taxonomyId: taxonomy.id,
				taxonomyName: taxonomy.name,
				termSlug: taxonomy.slug,
			});
			summary.added.push({
				game: game.slug,
				taxonomy: taxonomy.name,
				term: taxonomy.slug,
			});
		}
	}
}

if (!values["dry-run"] && pendingInserts.length > 0) {
	const backupPath = backupDatabase(databasePath);
	console.log(`Backup created at ${backupPath}`);

	const statements = [
		"BEGIN IMMEDIATE;",
		...pendingInserts.map(
			(item) =>
				`INSERT OR IGNORE INTO content_taxonomies (collection, entry_id, taxonomy_id) VALUES ('games', ${sqlString(item.gameId)}, ${sqlString(item.taxonomyId)});`,
		),
		"COMMIT;",
	];

	runSql(databasePath, statements.join("\n"));
}

console.log(JSON.stringify(summary, null, 2));
