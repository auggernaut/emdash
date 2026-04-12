import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = "/Users/home/Dev/git/emdash";
const databasePath = path.join(rootDir, "demos/ttrpg-games/data.db");
const backupsDir = path.join(rootDir, "demos/ttrpg-games/backups");
const affiliateId = "1659151";
const driveThruUrlPattern = /https?:\/\/(?:www\.)?drivethrurpg\.com\/[^\s"'<>)]*/gi;
const httpUrlPattern = /^http:\/\//i;
const leadingEmptyQueryParamPattern = /\?&/g;

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
	const backupPath = path.join(backupsDir, `data-${nowStamp()}-pre-drivethru-affiliate-fix.db`);
	fs.copyFileSync(databasePath, backupPath);
	for (const suffix of ["-wal", "-shm"]) {
		const sidecar = `${databasePath}${suffix}`;
		if (fs.existsSync(sidecar)) {
			fs.copyFileSync(sidecar, `${backupPath}${suffix}`);
		}
	}
	return backupPath;
}

function sqlString(value) {
	if (value == null) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function runJson(sql) {
	const output = execFileSync("sqlite3", ["-json", databasePath, sql], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
	return output ? JSON.parse(output) : [];
}

function runSql(sql) {
	const sqlPath = path.join(rootDir, `.tmp-drivethru-affiliate-${process.pid}.sql`);
	try {
		fs.writeFileSync(sqlPath, sql, "utf8");
		return execFileSync("sqlite3", [databasePath, `.read ${sqlPath}`], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
	} finally {
		fs.rmSync(sqlPath, { force: true });
	}
}

function normalizeDriveThruUrl(urlText) {
	try {
		let candidate = urlText
			.trim()
			.replace(httpUrlPattern, "https://")
			.replace(leadingEmptyQueryParamPattern, "?");
		const firstQuestionMark = candidate.indexOf("?");
		if (firstQuestionMark !== -1) {
			candidate =
				candidate.slice(0, firstQuestionMark + 1) +
				candidate.slice(firstQuestionMark + 1).replaceAll("?", "&");
		}

		const url = new URL(candidate);
		if (!url.hostname.endsWith("drivethrurpg.com")) return urlText;

		const params = new URLSearchParams();
		for (const [key, value] of url.searchParams.entries()) {
			if (key === "affiliate_id") continue;
			params.append(key, value);
		}
		params.set("affiliate_id", affiliateId);
		url.search = params.toString();
		return url.toString();
	} catch {
		return urlText;
	}
}

function normalizeDriveThruLinksInText(text) {
	if (!text || !text.includes("drivethrurpg.com")) return text;
	return text.replace(driveThruUrlPattern, (match) => normalizeDriveThruUrl(match));
}

const backupPath = backupDatabase();
const updates = [];

const gameRows = runJson(`
	SELECT id, slug, website_url, reviews_url, body_html
	FROM ec_games
	WHERE website_url LIKE '%drivethrurpg.com%'
		OR reviews_url LIKE '%drivethrurpg.com%'
		OR body_html LIKE '%drivethrurpg.com%';
`);

for (const row of gameRows) {
	const normalizedWebsite = normalizeDriveThruUrl(row.website_url || "");
	const normalizedReviews = normalizeDriveThruUrl(row.reviews_url || "");
	const normalizedBody = normalizeDriveThruLinksInText(row.body_html || "");
	if (
		normalizedWebsite === (row.website_url || "") &&
		normalizedReviews === (row.reviews_url || "") &&
		normalizedBody === (row.body_html || "")
	) {
		continue;
	}

	updates.push({
		table: "ec_games",
		id: row.id,
		slug: row.slug,
		sql: `UPDATE ec_games SET website_url = ${sqlString(normalizedWebsite)}, reviews_url = ${sqlString(normalizedReviews)}, body_html = ${sqlString(normalizedBody)}, updated_at = datetime('now') WHERE id = ${sqlString(row.id)};`,
	});
}

const postRows = runJson(`
	SELECT id, slug, body_html
	FROM ec_posts
	WHERE body_html LIKE '%drivethrurpg.com%';
`);

for (const row of postRows) {
	const normalizedBody = normalizeDriveThruLinksInText(row.body_html || "");
	if (normalizedBody === (row.body_html || "")) continue;
	updates.push({
		table: "ec_posts",
		id: row.id,
		slug: row.slug,
		sql: `UPDATE ec_posts SET body_html = ${sqlString(normalizedBody)}, updated_at = datetime('now') WHERE id = ${sqlString(row.id)};`,
	});
}

const categoryRows = runJson(`
	SELECT id, slug, description, body_html, comparison_html
	FROM ec_category_pages
	WHERE description LIKE '%drivethrurpg.com%'
		OR body_html LIKE '%drivethrurpg.com%'
		OR comparison_html LIKE '%drivethrurpg.com%';
`);

for (const row of categoryRows) {
	const normalizedDescription = normalizeDriveThruLinksInText(row.description || "");
	const normalizedBody = normalizeDriveThruLinksInText(row.body_html || "");
	const normalizedComparison = normalizeDriveThruLinksInText(row.comparison_html || "");
	if (
		normalizedDescription === (row.description || "") &&
		normalizedBody === (row.body_html || "") &&
		normalizedComparison === (row.comparison_html || "")
	) {
		continue;
	}

	updates.push({
		table: "ec_category_pages",
		id: row.id,
		slug: row.slug,
		sql: `UPDATE ec_category_pages SET description = ${sqlString(normalizedDescription)}, body_html = ${sqlString(normalizedBody)}, comparison_html = ${sqlString(normalizedComparison)}, updated_at = datetime('now') WHERE id = ${sqlString(row.id)};`,
	});
}

if (updates.length > 0) {
	runSql(`BEGIN IMMEDIATE;\n${updates.map((update) => update.sql).join("\n")}\nCOMMIT;`);
}

console.log(
	JSON.stringify(
		{
			backupPath,
			updatedCount: updates.length,
			updatedRows: updates.map((update) => ({
				table: update.table,
				slug: update.slug,
			})),
		},
		null,
		2,
	),
);
