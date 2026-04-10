import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(scriptDir, "..");
const defaultDatabasePath = path.join(rootDir, "demos/ttrpg-games/data.db");
const defaultEnvPath = path.join(rootDir, "demos/ttrpg-games/.env");
const uploadsDir = path.join(rootDir, "demos/ttrpg-games/uploads");
const publicGameImagesDir = path.join(rootDir, "demos/ttrpg-games/public/images/games");
const cloudinaryPrefix = "https://res.cloudinary.com/";
const LINE_SPLIT_PATTERN = /\r?\n/;
const STRIP_QUOTES_PATTERN = /^['"]|['"]$/g;
const META_OG_IMAGE_PATTERN =
	/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
const META_TWITTER_IMAGE_PATTERN =
	/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
const META_TWITTER_IMAGE_SRC_PATTERN =
	/<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
const JSON_IMAGE_PATTERN = /"image"\s*:\s*"([^"]+)"/gi;
const IMG_SRC_PATTERN = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|jpe?g|png|svg|webp)(\?|$)/i;
const BAD_FALLBACK_IMAGE_PATTERN = /(avatar|blank|favicon|icon|logo|sprite)/i;

const LOCAL_SOURCE_OVERRIDES = new Map([
	["for-gold-and-glory", path.join(publicGameImagesDir, "for-gold-and-glory.png")],
	["lion-dragon", path.join(publicGameImagesDir, "lion-dragon.jpg")],
	["neoclassical-geek-revival", path.join(publicGameImagesDir, "neoclassical-geek-revival.jpg")],
	["ose-advanced-fantasy", path.join(publicGameImagesDir, "ose-advanced-fantasy.png")],
	["sword-wizardry", path.join(publicGameImagesDir, "sword-wizardry.png")],
	["the-heros-journey", path.join(publicGameImagesDir, "the-heros-journey.jpg")],
]);

const REMOTE_SOURCE_OVERRIDES = new Map([
	[
		"adventurer-conqueror-king-system",
		"https://autarch.co/wp-content/uploads/2020/11/acks-cover.jpg",
	],
	[
		"black-sword-hack",
		"https://www.themerrymushmen.com/wp-content/uploads/2023/01/BSH-COVER-600x851.jpg",
	],
	[
		"delving-deeper",
		"https://assets.lulu.com/cover_thumbs/1/k/1k9qngkk-front-shortedge-384.jpg",
	],
	[
		"sharp-swords-sinister-spells",
		"https://img.itch.zone/aW1nLzg2NTIxNjYuanBn/original/oAZy%2BF.jpg",
	],
	[
		"thousand-year-old-vampire",
		"https://thousandyearoldvampire.com/cdn/shop/products/TYOVCover_1200x1200.jpg?v=1609637742",
	],
]);

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

function loadEnvFile(envPath) {
	const values = {};
	const source = fs.readFileSync(envPath, "utf8");

	for (const line of source.split(LINE_SPLIT_PATTERN)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const equalsIndex = trimmed.indexOf("=");
		if (equalsIndex === -1) continue;

		const key = trimmed.slice(0, equalsIndex).trim();
		const rawValue = trimmed.slice(equalsIndex + 1).trim();
		values[key] = rawValue.replace(STRIP_QUOTES_PATTERN, "");
	}

	return values;
}

function createSignature({ publicId, timestamp, apiSecret }) {
	return crypto
		.createHash("sha1")
		.update(`overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
		.digest("hex");
}

function resolveUrl(candidate, baseUrl) {
	try {
		return new URL(candidate, baseUrl).href;
	} catch {
		return null;
	}
}

async function request(url, init = {}) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 20000);
	const headers = { "user-agent": "Mozilla/5.0" };
	if (init.headers) {
		Object.assign(headers, init.headers);
	}

	try {
		return await fetch(url, {
			redirect: "follow",
			headers,
			...init,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeout);
	}
}

async function urlLooksHealthy(url) {
	try {
		const headResponse = await request(url, { method: "HEAD" });
		if (headResponse.ok) return true;

		const getResponse = await request(url, {
			method: "GET",
			headers: {
				range: "bytes=0-0",
			},
		});
		return getResponse.ok;
	} catch {
		return false;
	}
}

function extractImageCandidates(html, pageUrl) {
	const candidates = [];
	const patterns = [
		META_OG_IMAGE_PATTERN,
		META_TWITTER_IMAGE_PATTERN,
		META_TWITTER_IMAGE_SRC_PATTERN,
		JSON_IMAGE_PATTERN,
		IMG_SRC_PATTERN,
	];

	for (const pattern of patterns) {
		for (const match of html.matchAll(pattern)) {
			const candidate = resolveUrl(match[1], pageUrl);
			if (!candidate) continue;
			if (!IMAGE_EXTENSION_PATTERN.test(candidate)) continue;
			if (BAD_FALLBACK_IMAGE_PATTERN.test(candidate)) continue;
			candidates.push(candidate);
		}
	}

	return [...new Set(candidates)];
}

async function discoverFallbackImage(row) {
	if (!row.website_url) return null;

	try {
		const response = await request(row.website_url, { method: "GET" });
		if (!response.ok) return null;

		const html = await response.text();
		const candidates = extractImageCandidates(html, row.website_url);

		for (const candidate of candidates) {
			if (await urlLooksHealthy(candidate)) {
				return candidate;
			}
		}
	} catch {
		return null;
	}

	return null;
}

async function uploadRemoteToCloudinary({ sourceUrl, publicId, cloudName, apiKey, apiSecret }) {
	const timestamp = Math.floor(Date.now() / 1000);
	const signature = createSignature({ publicId, timestamp, apiSecret });
	const form = new FormData();

	form.set("file", sourceUrl);
	form.set("public_id", publicId);
	form.set("overwrite", "true");
	form.set("timestamp", String(timestamp));
	form.set("api_key", apiKey);
	form.set("signature", signature);

	const response = await request(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
		method: "POST",
		body: form,
	});

	if (!response.ok) {
		throw new Error(`Cloudinary remote upload failed with ${response.status}`);
	}

	return response.json();
}

async function uploadLocalToCloudinary({
	buffer,
	filename,
	publicId,
	cloudName,
	apiKey,
	apiSecret,
}) {
	const timestamp = Math.floor(Date.now() / 1000);
	const signature = createSignature({ publicId, timestamp, apiSecret });
	const form = new FormData();

	form.set("file", new Blob([buffer]), filename);
	form.set("public_id", publicId);
	form.set("overwrite", "true");
	form.set("timestamp", String(timestamp));
	form.set("api_key", apiKey);
	form.set("signature", signature);

	const response = await request(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
		method: "POST",
		body: form,
	});

	if (!response.ok) {
		throw new Error(`Cloudinary local upload failed with ${response.status}`);
	}

	return response.json();
}

async function downloadSource(url) {
	const response = await request(url, { method: "GET" });
	if (!response.ok) {
		throw new Error(`Download failed with ${response.status}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	return {
		buffer: Buffer.from(arrayBuffer),
		contentType: response.headers.get("content-type") || "application/octet-stream",
	};
}

function extensionFromContentType(contentType) {
	if (contentType.includes("image/png")) return "png";
	if (contentType.includes("image/webp")) return "webp";
	if (contentType.includes("image/svg")) return "svg";
	if (contentType.includes("image/gif")) return "gif";
	return "jpg";
}

async function migrateRow(row, env) {
	const publicId = `games/${row.slug}`;
	const localOverride = LOCAL_SOURCE_OVERRIDES.get(row.slug);
	const remoteOverride = REMOTE_SOURCE_OVERRIDES.get(row.slug);

	if (localOverride && fs.existsSync(localOverride)) {
		const upload = await uploadLocalToCloudinary({
			buffer: fs.readFileSync(localOverride),
			filename: path.basename(localOverride),
			publicId,
			cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
			apiKey: env.EMDASH_CLOUDINARY_API_KEY,
			apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
		});

		return {
			secureUrl: upload.secure_url,
			sourceUrl: localOverride,
			strategy: "local-override",
		};
	}

	if (remoteOverride) {
		try {
			const upload = await uploadRemoteToCloudinary({
				sourceUrl: remoteOverride,
				publicId,
				cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
				apiKey: env.EMDASH_CLOUDINARY_API_KEY,
				apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
			});

			return {
				secureUrl: upload.secure_url,
				sourceUrl: remoteOverride,
				strategy: "remote-override",
			};
		} catch {
			const download = await downloadSource(remoteOverride);
			const upload = await uploadLocalToCloudinary({
				buffer: download.buffer,
				filename: `${row.slug}.${extensionFromContentType(download.contentType)}`,
				publicId,
				cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
				apiKey: env.EMDASH_CLOUDINARY_API_KEY,
				apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
			});

			return {
				secureUrl: upload.secure_url,
				sourceUrl: remoteOverride,
				strategy: "downloaded-override",
			};
		}
	}

	if (row.image_url.startsWith("/")) {
		const filename = path.basename(row.image_url);
		const filePath = path.join(uploadsDir, filename);

		if (!fs.existsSync(filePath)) {
			throw new Error(`Local upload missing: ${filePath}`);
		}

		const upload = await uploadLocalToCloudinary({
			buffer: fs.readFileSync(filePath),
			filename,
			publicId,
			cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
			apiKey: env.EMDASH_CLOUDINARY_API_KEY,
			apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
		});

		return {
			secureUrl: upload.secure_url,
			sourceUrl: filePath,
			strategy: "local-upload",
		};
	}

	if (!row.image_url.startsWith(cloudinaryPrefix)) {
		try {
			const upload = await uploadRemoteToCloudinary({
				sourceUrl: row.image_url,
				publicId,
				cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
				apiKey: env.EMDASH_CLOUDINARY_API_KEY,
				apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
			});

			return {
				secureUrl: upload.secure_url,
				sourceUrl: row.image_url,
				strategy: "remote-original",
			};
		} catch {
			try {
				const download = await downloadSource(row.image_url);
				const upload = await uploadLocalToCloudinary({
					buffer: download.buffer,
					filename: `${row.slug}.${extensionFromContentType(download.contentType)}`,
					publicId,
					cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
					apiKey: env.EMDASH_CLOUDINARY_API_KEY,
					apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
				});

				return {
					secureUrl: upload.secure_url,
					sourceUrl: row.image_url,
					strategy: "downloaded-original",
				};
			} catch {
				// Fall through to website discovery.
			}
		}
	}

	const fallbackUrl = await discoverFallbackImage(row);
	if (!fallbackUrl) {
		throw new Error("No fallback image discovered from website_url");
	}

	const upload = await uploadRemoteToCloudinary({
		sourceUrl: fallbackUrl,
		publicId,
		cloudName: env.EMDASH_CLOUDINARY_CLOUD_NAME,
		apiKey: env.EMDASH_CLOUDINARY_API_KEY,
		apiSecret: env.EMDASH_CLOUDINARY_API_SECRET,
	});

	return {
		secureUrl: upload.secure_url,
		sourceUrl: fallbackUrl,
		strategy: "remote-fallback",
	};
}

const { values } = parseArgs({
	options: {
		database: {
			type: "string",
			default: defaultDatabasePath,
		},
		env: {
			type: "string",
			default: defaultEnvPath,
		},
		"dry-run": {
			type: "boolean",
			default: false,
		},
		slugs: {
			type: "string",
		},
	},
});

const databasePath = path.resolve(values.database);
const envPath = path.resolve(values.env);

if (!fs.existsSync(databasePath)) {
	console.error(`Database not found: ${databasePath}`);
	process.exit(1);
}

if (!fs.existsSync(envPath)) {
	console.error(`Env file not found: ${envPath}`);
	process.exit(1);
}

const env = loadEnvFile(envPath);
for (const key of [
	"EMDASH_CLOUDINARY_CLOUD_NAME",
	"EMDASH_CLOUDINARY_API_KEY",
	"EMDASH_CLOUDINARY_API_SECRET",
]) {
	if (!env[key]) {
		console.error(`Missing ${key} in ${envPath}`);
		process.exit(1);
	}
}

const rows = runJson(
	databasePath,
	[
		"SELECT id, slug, title, website_url, image_url",
		"FROM ec_games",
		"WHERE deleted_at IS NULL",
		"AND image_url IS NOT NULL",
		"AND image_url != ''",
		"ORDER BY slug ASC;",
	].join(" "),
);
const slugFilter = values.slugs
	? new Set(
			values.slugs
				.split(",")
				.map((slug) => slug.trim())
				.filter(Boolean),
		)
	: null;

const brokenCloudinaryRows = [];
const targetRows = [];

for (const row of rows) {
	if (slugFilter) {
		if (!slugFilter.has(row.slug)) continue;
		targetRows.push(row);
		continue;
	}

	if (!row.image_url.startsWith(cloudinaryPrefix)) {
		targetRows.push(row);
		continue;
	}

	if (!(await urlLooksHealthy(row.image_url))) {
		brokenCloudinaryRows.push(row);
		targetRows.push(row);
	}
}

const summary = {
	database: databasePath,
	dryRun: values["dry-run"],
	targets: targetRows.length,
	updated: [],
	failed: [],
	brokenCloudinaryDetected: brokenCloudinaryRows.map((row) => row.slug),
};

let backupPath = null;
const updateStatements = [];

for (const row of targetRows) {
	try {
		const result = await migrateRow(row, env);
		summary.updated.push({
			slug: row.slug,
			title: row.title,
			from: row.image_url,
			to: result.secureUrl,
			source: result.sourceUrl,
			strategy: result.strategy,
		});

		updateStatements.push(
			`UPDATE ec_games SET image_url = ${sqlString(result.secureUrl)} WHERE id = ${sqlString(row.id)};`,
		);
	} catch (error) {
		summary.failed.push({
			slug: row.slug,
			title: row.title,
			image_url: row.image_url,
			website_url: row.website_url,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

if (!values["dry-run"] && updateStatements.length > 0) {
	backupPath = backupDatabase(databasePath);
	runSql(databasePath, ["BEGIN IMMEDIATE;", ...updateStatements, "COMMIT;"].join("\n"));
}

if (backupPath) {
	summary.backupPath = backupPath;
}

console.log(JSON.stringify(summary, null, 2));
