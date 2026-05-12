import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify, parseArgs } from "node:util";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultSiteDir = path.join(rootDir, "sites/ttrpg-games");
const nonAlphanumericPattern = /[^a-z0-9]+/g;

function normalizeKey(value) {
	return String(value || "").toLowerCase().replace(nonAlphanumericPattern, "");
}

function pad2(value) {
	return String(value).padStart(2, "0");
}

function timestamp() {
	const date = new Date();
	return [
		date.getUTCFullYear(),
		pad2(date.getUTCMonth() + 1),
		pad2(date.getUTCDate()),
		"-",
		pad2(date.getUTCHours()),
		pad2(date.getUTCMinutes()),
		pad2(date.getUTCSeconds()),
	].join("");
}

function sqlString(value) {
	if (value == null) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function setUnique(map, key, value) {
	if (!key) return;
	if (map.has(key) && map.get(key) !== value) {
		map.set(key, null);
		return;
	}
	map.set(key, value);
}

function loadMigrationUrlMap(reportsDir) {
	const map = new Map();
	if (!fs.existsSync(reportsDir)) return map;

	for (const entry of fs.readdirSync(reportsDir)) {
		if (!entry.startsWith("cloudinary-to-r2-") || !entry.endsWith(".json")) continue;
		const filePath = path.join(reportsDir, entry);
		const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
		for (const item of manifest.succeeded || []) {
			if (item.from && item.target?.url) {
				map.set(item.from, item.target.url);
			}
		}
	}

	return map;
}

async function runWrangler(siteDir, args) {
	const { stdout } = await execFileAsync(
		"pnpm",
		["--dir", siteDir, "exec", "wrangler", ...args],
		{
			encoding: "utf8",
			maxBuffer: 1024 * 1024 * 16,
		},
	);
	return stdout;
}

async function runD1Json(siteDir, database, sql) {
	const stdout = await runWrangler(siteDir, [
		"d1",
		"execute",
		database,
		"--remote",
		"--json",
		"--command",
		sql,
	]);
	const payload = JSON.parse(stdout);
	const result = payload[0];
	if (!result?.success) {
		throw new Error(`D1 query failed: ${stdout}`);
	}
	return result.results || [];
}

async function runD1File(siteDir, database, filePath) {
	await runWrangler(siteDir, [
		"d1",
		"execute",
		database,
		"--remote",
		"--json",
		"--file",
		filePath,
		"--yes",
	]);
}

const { values } = parseArgs({
	options: {
		apply: { type: "boolean", default: false },
		database: { type: "string", default: "ttrpg-games" },
		manifest: { type: "string" },
		"site-dir": { type: "string", default: defaultSiteDir },
	},
});

const apply = values.apply;
const siteDir = path.resolve(values["site-dir"]);
const reportsDir = path.join(siteDir, "reports");
const stamp = timestamp();
const manifestPath = path.resolve(
	values.manifest || path.join(reportsDir, `related-image-url-repair-${stamp}.json`),
);
const applySqlPath = manifestPath.replace(/\.json$/i, ".apply.sql");
const rollbackSqlPath = manifestPath.replace(/\.json$/i, ".rollback.sql");

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });

const imageRows = await runD1Json(
	siteDir,
	values.database,
	[
		"SELECT slug, title, image_url",
		"FROM ec_games",
		"WHERE deleted_at IS NULL",
		"AND image_url IS NOT NULL",
		"AND image_url != '';",
	].join(" "),
);
const imageBySlug = new Map(imageRows.map((row) => [row.slug, row.image_url]));
const imageByNormalizedSlug = new Map();
const imageByNormalizedTitle = new Map();
const imageByOldUrl = loadMigrationUrlMap(reportsDir);

for (const row of imageRows) {
	setUnique(imageByNormalizedSlug, normalizeKey(row.slug), row.image_url);
	setUnique(imageByNormalizedTitle, normalizeKey(row.title), row.image_url);
}

const rows = await runD1Json(
	siteDir,
	values.database,
	[
		"SELECT id, slug, related",
		"FROM ec_games",
		"WHERE deleted_at IS NULL",
		"AND related LIKE '%res.cloudinary.com%'",
		"ORDER BY slug ASC;",
	].join(" "),
);

const updates = [];
const failed = [];

for (const row of rows) {
	try {
		const related = JSON.parse(row.related);
		if (!Array.isArray(related)) continue;

		let replacements = 0;
		const repaired = related.map((item) => {
			if (!item || typeof item !== "object") return item;
			const replacement =
				(typeof item.slug === "string" ? imageBySlug.get(item.slug) : null) ||
				(typeof item.slug === "string" ? imageByNormalizedSlug.get(normalizeKey(item.slug)) : null) ||
				(typeof item.title === "string" ? imageByNormalizedTitle.get(normalizeKey(item.title)) : null) ||
				(typeof item.image_url === "string" ? imageByOldUrl.get(item.image_url) : null);
			if (!replacement || item.image_url === replacement) return item;
			replacements += 1;
			return { ...item, image_url: replacement };
		});

		if (replacements === 0) continue;

		updates.push({
			id: row.id,
			slug: row.slug,
			from: row.related,
			to: JSON.stringify(repaired),
			replacements,
		});
	} catch (error) {
		failed.push({
			id: row.id,
			slug: row.slug,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

const applyStatements = updates.map((update) =>
	[
		"UPDATE ec_games",
		`SET related = ${sqlString(update.to)}`,
		`WHERE id = ${sqlString(update.id)}`,
		`AND related = ${sqlString(update.from)};`,
	].join(" "),
);
const rollbackStatements = updates.map((update) =>
	[
		"UPDATE ec_games",
		`SET related = ${sqlString(update.from)}`,
		`WHERE id = ${sqlString(update.id)}`,
		`AND related = ${sqlString(update.to)};`,
	].join(" "),
);

const summary = {
	apply,
	database: values.database,
	rowsScanned: rows.length,
	rowsUpdated: updates.length,
	replacements: updates.reduce((sum, update) => sum + update.replacements, 0),
	failed,
	manifestPath,
	applySqlPath: apply ? applySqlPath : null,
	rollbackSqlPath: apply ? rollbackSqlPath : null,
	updates: updates.map((update) => ({
		id: update.id,
		slug: update.slug,
		replacements: update.replacements,
	})),
};

if (applyStatements.length > 0) {
	fs.writeFileSync(applySqlPath, `${applyStatements.join("\n")}\n`);
	fs.writeFileSync(rollbackSqlPath, `${rollbackStatements.join("\n")}\n`);
	if (apply) {
		await runD1File(siteDir, values.database, applySqlPath);
	}
}

fs.writeFileSync(manifestPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
	apply,
	rowsScanned: summary.rowsScanned,
	rowsUpdated: summary.rowsUpdated,
	replacements: summary.replacements,
	failed: summary.failed.length,
	manifestPath,
	applySqlPath: apply ? applySqlPath : null,
	rollbackSqlPath: apply ? rollbackSqlPath : null,
}, null, 2));
