import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { parseArgs } from "node:util";

const execFileAsync = promisify(execFile);

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultSiteDir = path.join(rootDir, "sites/ttrpg-games");
const cloudinaryPrefix = "https://res.cloudinary.com/";
const mediaFilePrefix = "/_emdash/api/media/file/";
const cacheControl = "public, max-age=31536000, immutable";
const envLinePattern = /\r?\n/;
const envCommentPattern = /^\s*#/;
const envAssignmentPattern = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/;
const quotedValuePattern = /^(['"])(.*)\1$/;
const safeSlugPattern = /[^A-Za-z0-9._-]+/g;
const imageExtensionPattern = /\.(avif|gif|jpe?g|png|webp)$/i;
const leadingDotPattern = /^\./;
const leadingTrailingDashPattern = /^-+|-+$/g;
const serverTimingSizePattern = /bytes=(\d+)/i;
const serverTimingWidthPattern = /width=(\d+)/i;
const serverTimingHeightPattern = /height=(\d+)/i;

const contentTypeExtensions = new Map([
	["image/avif", "avif"],
	["image/gif", "gif"],
	["image/jpeg", "jpg"],
	["image/jpg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
]);

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

function sqlNumber(value) {
	return Number.isFinite(value) ? String(value) : "NULL";
}

function loadEnvFile(filePath) {
	if (!fs.existsSync(filePath)) return {};
	const env = {};
	const content = fs.readFileSync(filePath, "utf8");

	for (const line of content.split(envLinePattern)) {
		if (!line.trim() || envCommentPattern.test(line)) continue;
		const match = line.match(envAssignmentPattern);
		if (!match) continue;
		let value = match[2].trim();
		const quoted = value.match(quotedValuePattern);
		if (quoted) value = quoted[2];
		env[match[1]] = value;
	}

	return env;
}

function mediaId() {
	return `m_${crypto.randomUUID().replaceAll("-", "")}`;
}

function normalizeContentType(value) {
	const [contentType] = String(value || "").split(";");
	return contentType.trim().toLowerCase() || "application/octet-stream";
}

function extensionFromContentType(contentType) {
	return contentTypeExtensions.get(normalizeContentType(contentType)) || "jpg";
}

function extensionFromUrl(sourceUrl, contentType) {
	try {
		const { pathname } = new URL(sourceUrl);
		const extension = path.extname(pathname).toLowerCase().replace(leadingDotPattern, "");
		if (extension && imageExtensionPattern.test(`.${extension}`)) {
			return extension === "jpeg" ? "jpg" : extension;
		}
	} catch {
		// Fall back to the response content type below.
	}

	return extensionFromContentType(contentType);
}

function safeSlug(slug) {
	return String(slug || "game").replace(safeSlugPattern, "-").replace(leadingTrailingDashPattern, "") || "game";
}

function parseHeaderNumber(headers, name) {
	const value = headers.get(name);
	if (!value) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseServerTimingNumber(headers, pattern) {
	const serverTiming = headers.get("server-timing") || "";
	const match = serverTiming.match(pattern);
	if (!match) return null;
	const value = Number(match[1]);
	return Number.isFinite(value) ? value : null;
}

function metadataFromHeaders(headers) {
	return {
		contentType: normalizeContentType(headers.get("content-type")),
		size: parseHeaderNumber(headers, "content-length") ?? parseServerTimingNumber(headers, serverTimingSizePattern),
		width: parseServerTimingNumber(headers, serverTimingWidthPattern),
		height: parseServerTimingNumber(headers, serverTimingHeightPattern),
	};
}

async function runWrangler(siteDir, args, options = {}) {
	const { stdout, stderr } = await execFileAsync("pnpm", ["--dir", siteDir, "exec", "wrangler", ...args], {
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 16,
		...options,
	});
	return { stdout, stderr };
}

async function runD1Json(siteDir, database, sql) {
	const { stdout } = await runWrangler(siteDir, [
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

async function headImage(sourceUrl) {
	const response = await fetch(sourceUrl, { method: "HEAD", redirect: "follow" });
	if (!response.ok) {
		throw new Error(`HEAD failed with ${response.status}`);
	}
	return metadataFromHeaders(response.headers);
}

async function downloadImage(sourceUrl) {
	const response = await fetch(sourceUrl, { method: "GET", redirect: "follow" });
	if (!response.ok) {
		throw new Error(`GET failed with ${response.status}`);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	const metadata = metadataFromHeaders(response.headers);
	return {
		buffer,
		contentType: metadata.contentType,
		size: buffer.length || metadata.size,
		width: metadata.width,
		height: metadata.height,
		contentHash: crypto.createHash("sha256").update(buffer).digest("hex"),
	};
}

async function uploadToR2(siteDir, bucket, key, filePath, contentType) {
	await runWrangler(siteDir, [
		"r2",
		"object",
		"put",
		`${bucket}/${key}`,
		"--remote",
		"--file",
		filePath,
		"--content-type",
		contentType,
		"--cache-control",
		cacheControl,
		"--force",
	]);
}

async function uploadToWorker(uploadUrl, token, key, buffer, contentType) {
	const url = new URL(uploadUrl);
	url.searchParams.set("key", key);

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": contentType,
			"Content-Length": String(buffer.length),
		},
		body: buffer,
	});

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(`Worker upload failed with ${response.status}${body ? `: ${body}` : ""}`);
	}
}

function buildTarget(row, metadata) {
	const extension = extensionFromUrl(row.image_url, metadata.contentType);
	const key = `games/${safeSlug(row.slug)}.${extension}`;
	return {
		key,
		url: `${mediaFilePrefix}${key}`,
		filename: `${safeSlug(row.slug)}.${extension}`,
	};
}

function buildApplySql(successes) {
	const statements = [];

	for (const item of successes) {
		statements.push(
			[
				"UPDATE media",
				`SET filename = ${sqlString(item.target.filename)},`,
				`mime_type = ${sqlString(item.contentType)},`,
				`size = ${sqlNumber(item.size)},`,
				`width = ${sqlNumber(item.width)},`,
				`height = ${sqlNumber(item.height)},`,
				`alt = ${sqlString(item.title)},`,
				"caption = NULL,",
				`content_hash = ${sqlString(item.contentHash)},`,
				"status = 'ready',",
				"blurhash = NULL,",
				"dominant_color = NULL",
				`WHERE storage_key = ${sqlString(item.target.key)};`,
			].join(" "),
		);
		statements.push(
			[
				"INSERT INTO media",
				"(id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, created_at, author_id, status, blurhash, dominant_color)",
				"SELECT",
				[
					sqlString(mediaId()),
					sqlString(item.target.filename),
					sqlString(item.contentType),
					sqlNumber(item.size),
					sqlNumber(item.width),
					sqlNumber(item.height),
					sqlString(item.title),
					"NULL",
					sqlString(item.target.key),
					sqlString(item.contentHash),
					sqlString(new Date().toISOString()),
					"NULL",
					"'ready'",
					"NULL",
					"NULL",
				].join(", "),
				`WHERE NOT EXISTS (SELECT 1 FROM media WHERE storage_key = ${sqlString(item.target.key)});`,
			].join(" "),
		);
		statements.push(
			[
				"UPDATE ec_games",
				`SET image_url = ${sqlString(item.target.url)}`,
				`WHERE id = ${sqlString(item.id)}`,
				`AND image_url = ${sqlString(item.from)};`,
			].join(" "),
		);
	}

	return `${statements.join("\n")}\n`;
}

function buildRollbackSql(successes) {
	const statements = [];
	for (const item of successes) {
		statements.push(
			[
				"UPDATE ec_games",
				`SET image_url = ${sqlString(item.from)}`,
				`WHERE id = ${sqlString(item.id)}`,
				`AND image_url = ${sqlString(item.target.url)};`,
			].join(" "),
		);
	}
	return `${statements.join("\n")}\n`;
}

async function mapLimit(items, limit, callback) {
	const results = Array.from({ length: items.length });
	let index = 0;

	async function worker() {
		for (;;) {
			const current = index;
			index += 1;
			if (current >= items.length) break;
			results[current] = await callback(items[current], current);
		}
	}

	const workers = [];
	for (let i = 0; i < Math.max(1, Math.min(limit, items.length)); i += 1) {
		workers.push(worker());
	}
	await Promise.all(workers);
	return results;
}

function parseSlugFilter(value) {
	if (!value) return null;
	return new Set(
		value
			.split(",")
			.map((slug) => slug.trim())
			.filter(Boolean),
	);
}

const { values } = parseArgs({
	options: {
		apply: { type: "boolean", default: false },
		bucket: { type: "string", default: "ttrpg-games-media" },
		concurrency: { type: "string", default: "4" },
		database: { type: "string", default: "ttrpg-games" },
		limit: { type: "string" },
		manifest: { type: "string" },
		"env-file": { type: "string" },
		"site-dir": { type: "string", default: defaultSiteDir },
		slugs: { type: "string" },
		"source-url": { type: "string" },
		"tmp-dir": { type: "string" },
		"upload-url": { type: "string" },
	},
});

const apply = values.apply;
const siteDir = path.resolve(values["site-dir"]);
const reportsDir = path.join(siteDir, "reports");
const stamp = timestamp();
const manifestPath = path.resolve(
	values.manifest || path.join(reportsDir, `cloudinary-to-r2-${stamp}.json`),
);
const applySqlPath = manifestPath.replace(/\.json$/i, ".apply.sql");
const rollbackSqlPath = manifestPath.replace(/\.json$/i, ".rollback.sql");
const tmpDir = path.resolve(values["tmp-dir"] || path.join(os.tmpdir(), `ttrpg-cloudinary-to-r2-${stamp}`));
const concurrency = Number.parseInt(values.concurrency, 10) || 4;
const limit = values.limit ? Number.parseInt(values.limit, 10) : null;
const slugFilter = parseSlugFilter(values.slugs);
const sourceOverride = values["source-url"] || null;
const uploadUrl = values["upload-url"] || null;
const envFile = path.resolve(values["env-file"] || path.join(siteDir, ".env"));
const env = uploadUrl ? loadEnvFile(envFile) : {};
const uploadToken = uploadUrl ? env.SEOBOT_SYNC_SECRET || process.env.SEOBOT_SYNC_SECRET : null;

if (uploadUrl && !uploadToken) {
	throw new Error(`Missing SEOBOT_SYNC_SECRET in ${envFile} or process env`);
}

fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });

let rows = await runD1Json(
	siteDir,
	values.database,
	[
		"SELECT id, slug, title, image_url",
		"FROM ec_games",
		"WHERE deleted_at IS NULL",
		"AND image_url LIKE 'https://res.cloudinary.com/%'",
		"ORDER BY slug ASC;",
	].join(" "),
);

if (slugFilter) {
	rows = rows.filter((row) => slugFilter.has(row.slug));
}

if (limit != null) {
	rows = rows.slice(0, limit);
}

if (sourceOverride && rows.length !== 1) {
	throw new Error("--source-url requires a filter that resolves to exactly one row");
}

const summary = {
	apply,
	database: values.database,
	bucket: values.bucket,
	siteDir,
	uploadMode: uploadUrl ? "worker" : "wrangler-r2-api",
	manifestPath,
	applySqlPath: apply ? applySqlPath : null,
	rollbackSqlPath: apply ? rollbackSqlPath : null,
	totalCandidates: rows.length,
	succeeded: [],
	failed: [],
};

console.error(`${apply ? "Migrating" : "Dry run checking"} ${rows.length} Cloudinary image URLs`);

const results = await mapLimit(rows, concurrency, async (row, index) => {
	try {
		const sourceUrl = sourceOverride || row.image_url;

		if (!sourceOverride && !row.image_url?.startsWith(cloudinaryPrefix)) {
			throw new Error("Not a Cloudinary URL");
		}

		const headMetadata = await headImage(sourceUrl);
		const target = buildTarget({ ...row, image_url: sourceUrl }, headMetadata);

		if (!apply) {
			console.error(`[${index + 1}/${rows.length}] ${row.slug} -> ${target.url}`);
			return {
				ok: true,
				item: {
					id: row.id,
					slug: row.slug,
					title: row.title,
					from: row.image_url,
					source: sourceUrl,
					target,
					contentType: headMetadata.contentType,
					size: headMetadata.size,
					width: headMetadata.width,
					height: headMetadata.height,
					contentHash: null,
				},
			};
		}

		const download = await downloadImage(sourceUrl);
		const uploadMetadata = {
			...download,
			contentType: download.contentType || headMetadata.contentType,
			size: download.size || headMetadata.size,
			width: download.width || headMetadata.width,
			height: download.height || headMetadata.height,
		};
		const uploadTarget = buildTarget({ ...row, image_url: sourceUrl }, uploadMetadata);
		if (uploadUrl) {
			await uploadToWorker(uploadUrl, uploadToken, uploadTarget.key, download.buffer, uploadMetadata.contentType);
		} else {
			const filePath = path.join(
				tmpDir,
				`${safeSlug(row.slug)}.${extensionFromContentType(uploadMetadata.contentType)}`,
			);
			fs.writeFileSync(filePath, download.buffer);
			await uploadToR2(siteDir, values.bucket, uploadTarget.key, filePath, uploadMetadata.contentType);
			fs.rmSync(filePath, { force: true });
		}
		console.error(`[${index + 1}/${rows.length}] uploaded ${row.slug} -> ${uploadTarget.url}`);

		return {
			ok: true,
			item: {
				id: row.id,
				slug: row.slug,
				title: row.title,
				from: row.image_url,
				source: sourceUrl,
				target: uploadTarget,
				contentType: uploadMetadata.contentType,
				size: uploadMetadata.size,
				width: uploadMetadata.width,
				height: uploadMetadata.height,
				contentHash: uploadMetadata.contentHash,
			},
		};
	} catch (error) {
		console.error(`[${index + 1}/${rows.length}] failed ${row.slug}: ${error instanceof Error ? error.message : String(error)}`);
		return {
			ok: false,
			item: {
				id: row.id,
				slug: row.slug,
				title: row.title,
				from: row.image_url,
				error: error instanceof Error ? error.message : String(error),
			},
		};
	}
});

for (const result of results) {
	if (result.ok) {
		summary.succeeded.push(result.item);
	} else {
		summary.failed.push(result.item);
	}
}

if (apply && summary.succeeded.length > 0) {
	fs.writeFileSync(applySqlPath, buildApplySql(summary.succeeded));
	fs.writeFileSync(rollbackSqlPath, buildRollbackSql(summary.succeeded));
	await runD1File(siteDir, values.database, applySqlPath);
}

fs.writeFileSync(manifestPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(JSON.stringify({
	apply,
	totalCandidates: summary.totalCandidates,
	succeeded: summary.succeeded.length,
	failed: summary.failed.length,
	manifestPath,
	applySqlPath: apply ? applySqlPath : null,
	rollbackSqlPath: apply ? rollbackSqlPath : null,
}, null, 2));
