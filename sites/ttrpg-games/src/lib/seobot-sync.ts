import { htmlToPortableText } from "@emdash-cms/gutenberg-to-portable-text";
import { handleMediaCreate, type Database, type Storage, ulid } from "emdash";
import { sql, type Kysely } from "kysely";
import type { IArticleIndex } from "seobot/dist/types/blog";

import { getSeobotArticle, getSeobotArticles, getSeobotHeadline } from "./seobot";
import { getSeobotPostMetadata } from "./seobot-post-metadata";

const IMPORT_TABLE = "_ttrpg_seobot_imports";
const SYNC_STATE_TABLE = "_ttrpg_seobot_sync_state";
const PAGE_SIZE = 50;
const SYNC_TASK_NAME = "seobot-post-import";
const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
const RETRY_DELAY_MINUTES = 15;
const STALE_LOCK_MINUTES = 30;
const HTML_IMG_TAG_PATTERN = /<img\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/gi;
const DRIVETHRU_AFFILIATE_ID = "1659151";
const DRIVETHRU_URL_PATTERN = /https?:\/\/(?:www\.)?drivethrurpg\.com\/[^\s"'<>)]*/gi;
const HTTP_URL_PATTERN = /^http:\/\//i;
const LEADING_EMPTY_QUERY_PARAM_PATTERN = /\?&/g;

type ContentHandlerResult = {
	success: boolean;
	data?: {
		item: {
			id: string;
			slug: string | null;
		};
	};
	error?: {
		message: string;
	};
};

type RuntimeLike = {
	db: Kysely<Database>;
	storage: Storage | null;
	handleContentCreate: (
		collection: string,
		body: {
			data: Record<string, unknown>;
			slug?: string;
			status?: string;
			authorId?: string;
			locale?: string;
			translationOf?: string;
		},
	) => Promise<ContentHandlerResult>;
	handleContentGet: (
		collection: string,
		id: string,
		locale?: string,
	) => Promise<ContentHandlerResult>;
};

type ImportStateRow = {
	source_id: string;
	source_slug: string;
	post_id: string;
};

type PostMetadataTargetRow = {
	post_id: string;
	source_slug: string;
};

export type SeobotSyncResult = {
	configured: boolean;
	importedCount: number;
	repairedCount: number;
	linkedCount: number;
	skippedCount: number;
	importedSlugs: string[];
	error: string | null;
};

export type SeobotSyncDueResult = {
	triggered: boolean;
	result: SeobotSyncResult | null;
};

function hasSyncTable(db: Kysely<Database>) {
	return sql<{ name: string }>`
		SELECT name
		FROM sqlite_master
		WHERE type = 'table' AND name = ${IMPORT_TABLE}
	`.execute(db);
}

async function ensureImportStateTable(db: Kysely<Database>): Promise<void> {
	const existing = await hasSyncTable(db);
	if (existing.rows.length > 0) return;

	await sql`
		CREATE TABLE ${sql.ref(IMPORT_TABLE)} (
			source_id TEXT PRIMARY KEY,
			source_slug TEXT NOT NULL UNIQUE,
			post_id TEXT NOT NULL UNIQUE,
			imported_at TEXT NOT NULL DEFAULT (datetime('now'))
		)
	`.execute(db);

	await sql`
		CREATE INDEX ${sql.ref("idx_ttrpg_seobot_imports_source_slug")}
		ON ${sql.ref(IMPORT_TABLE)} (source_slug)
	`.execute(db);
}

async function ensureSyncStateTable(db: Kysely<Database>): Promise<void> {
	const existing = await sql<{ name: string }>`
		SELECT name
		FROM sqlite_master
		WHERE type = 'table' AND name = ${SYNC_STATE_TABLE}
	`.execute(db);

	if (existing.rows.length === 0) {
		await sql`
			CREATE TABLE ${sql.ref(SYNC_STATE_TABLE)} (
				task_name TEXT PRIMARY KEY,
				next_run_at TEXT NOT NULL,
				last_run_at TEXT NULL,
				locked_at TEXT NULL,
				last_error TEXT NULL
			)
		`.execute(db);
	}

	await sql`
		INSERT INTO ${sql.ref(SYNC_STATE_TABLE)} (task_name, next_run_at)
		VALUES (${SYNC_TASK_NAME}, datetime('now'))
		ON CONFLICT(task_name) DO NOTHING
	`.execute(db);
}

async function loadImportState(db: Kysely<Database>): Promise<Map<string, ImportStateRow>> {
	const result = await sql<ImportStateRow>`
		SELECT source_id, source_slug, post_id
		FROM ${sql.ref(IMPORT_TABLE)}
	`.execute(db);

	return new Map(result.rows.map((row: ImportStateRow) => [row.source_id, row]));
}

async function recordImport(
	db: Kysely<Database>,
	sourceId: string,
	sourceSlug: string,
	postId: string,
): Promise<void> {
	await sql`
		INSERT INTO ${sql.ref(IMPORT_TABLE)} (source_id, source_slug, post_id)
		VALUES (${sourceId}, ${sourceSlug}, ${postId})
		ON CONFLICT(source_id) DO UPDATE SET
			source_slug = excluded.source_slug,
			post_id = excluded.post_id,
			imported_at = datetime('now')
	`.execute(db);
}

async function syncImportedPostMetadata(
	db: Kysely<Database>,
	postId: string,
	metadata: {
		is_tool: boolean;
		tool_id: string | null;
	},
): Promise<void> {
	await sql`
		UPDATE ${sql.ref("ec_posts")}
		SET
			is_tool = ${metadata.is_tool ? 1 : 0},
			tool_id = ${metadata.tool_id}
		WHERE id = ${postId}
	`.execute(db);
}

function addMinutes(date: Date, minutes: number): string {
	return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function normalizeDriveThruUrl(urlText: string): string {
	try {
		let candidate = urlText
			.trim()
			.replace(HTTP_URL_PATTERN, "https://")
			.replace(LEADING_EMPTY_QUERY_PARAM_PATTERN, "?");
		const firstQuestionMark = candidate.indexOf("?");
		if (firstQuestionMark !== -1) {
			candidate =
				candidate.slice(0, firstQuestionMark + 1) +
				candidate.slice(firstQuestionMark + 1).replaceAll("?", "&");
		}

		const url = new URL(candidate);
		if (!url.hostname.endsWith("drivethrurpg.com")) return urlText;

		const preservedParams = new URLSearchParams();
		for (const [key, value] of url.searchParams.entries()) {
			if (key === "affiliate_id") continue;
			preservedParams.append(key, value);
		}
		preservedParams.set("affiliate_id", DRIVETHRU_AFFILIATE_ID);
		url.search = preservedParams.toString();
		return url.toString();
	} catch {
		return urlText;
	}
}

function normalizeDriveThruLinksInHtml(html: string): string {
	if (!html.includes("drivethrurpg.com")) return html;
	return html.replace(DRIVETHRU_URL_PATTERN, (match) => normalizeDriveThruUrl(match));
}

function getSyncIntervalMinutes(): number {
	const raw =
		import.meta.env.EMDASH_SEOBOT_SYNC_INTERVAL_MINUTES ||
		import.meta.env.SEOBOT_SYNC_INTERVAL_MINUTES ||
		"";
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SYNC_INTERVAL_MINUTES;
}

async function claimDueSync(db: Kysely<Database>): Promise<boolean> {
	await ensureSyncStateTable(db);

	const now = new Date().toISOString();
	const staleCutoff = addMinutes(new Date(), -STALE_LOCK_MINUTES);
	const result = await sql<{ task_name: string }>`
		UPDATE ${sql.ref(SYNC_STATE_TABLE)}
		SET locked_at = ${now}
		WHERE task_name = ${SYNC_TASK_NAME}
			AND next_run_at <= ${now}
			AND (locked_at IS NULL OR locked_at < ${staleCutoff})
		RETURNING task_name
	`.execute(db);

	return result.rows.length > 0;
}

async function finalizeDueSync(db: Kysely<Database>, result: SeobotSyncResult): Promise<void> {
	const now = new Date();
	const nextRunAt = addMinutes(now, result.error ? RETRY_DELAY_MINUTES : getSyncIntervalMinutes());

	await sql`
		UPDATE ${sql.ref(SYNC_STATE_TABLE)}
		SET
			last_run_at = ${now.toISOString()},
			next_run_at = ${nextRunAt},
			locked_at = NULL,
			last_error = ${result.error}
		WHERE task_name = ${SYNC_TASK_NAME}
	`.execute(db);
}

async function discoverNewArticles(db: Kysely<Database>): Promise<{
	configured: boolean;
	error: string | null;
	articles: IArticleIndex[];
}> {
	await ensureImportStateTable(db);
	const imports = await loadImportState(db);
	const knownIds = new Set(imports.keys());
	const knownSlugs = new Set(Array.from(imports.values(), (row) => row.source_slug));
	const discovered: IArticleIndex[] = [];

	for (let page = 0; page < 20; page++) {
		const result = await getSeobotArticles(page, PAGE_SIZE);
		if (!result.configured || result.error) {
			return {
				configured: result.configured,
				error: result.error,
				articles: [],
			};
		}

		if (result.articles.length === 0) break;

		const newArticles = result.articles.filter(
			(article) => !knownIds.has(article.id) && !knownSlugs.has(article.slug),
		);
		discovered.push(...newArticles);

		// Keep scanning older pages even if this page is fully known.
		// Otherwise the sync stalls once the newest page has been imported.
		if ((page + 1) * PAGE_SIZE >= result.total) break;
	}

	return {
		configured: true,
		error: null,
		articles: discovered,
	};
}

function extensionForImage(url: string, contentType: string): string {
	const byType = (() => {
		switch (contentType.toLowerCase().split(";")[0]) {
			case "image/jpeg":
				return ".jpg";
			case "image/png":
				return ".png";
			case "image/webp":
				return ".webp";
			case "image/gif":
				return ".gif";
			case "image/svg+xml":
				return ".svg";
			default:
				return "";
		}
	})();

	if (byType) return byType;

	try {
		const pathname = new URL(url).pathname;
		const dotIndex = pathname.lastIndexOf(".");
		if (dotIndex > -1) {
			return pathname.slice(dotIndex).toLowerCase();
		}
	} catch {
		// Ignore invalid URL parsing and fall back below.
	}

	return ".jpg";
}

async function findExistingMediaByFilename(
	db: Kysely<Database>,
	filename: string,
): Promise<{
	id: string;
	filename: string;
	mime_type: string;
	storage_key: string;
	width: number | null;
	height: number | null;
} | null> {
	const media = await db
		.selectFrom("media")
		.select(["id", "filename", "mime_type", "storage_key", "width", "height"])
		.where("filename", "=", filename)
		.orderBy("created_at", "desc")
		.executeTakeFirst();

	return media ?? null;
}

async function importImageUrlToLocal(
	runtime: RuntimeLike,
	articleSlug: string,
	headline: string,
	imageUrl: string,
	index: number,
): Promise<string> {
	if (!imageUrl || !runtime.storage) return imageUrl;
	if (imageUrl.startsWith("/_emdash/api/media/file/")) return imageUrl;

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return imageUrl;
		}

		const contentType = response.headers.get("content-type") || "image/jpeg";
		const bytes = await response.arrayBuffer();
		const extension = extensionForImage(imageUrl, contentType);
		const filename = `${articleSlug}-inline-${index}${extension}`;
		const existing = await findExistingMediaByFilename(runtime.db, filename);
		if (existing) {
			return `/_emdash/api/media/file/${existing.storage_key}`;
		}
		const storageKey = `${ulid()}${extension}`;

		await runtime.storage.upload({
			key: storageKey,
			body: new Uint8Array(bytes),
			contentType,
		});

		const media = await handleMediaCreate(runtime.db, {
			filename,
			mimeType: contentType,
			size: bytes.byteLength,
			alt: headline,
			storageKey,
		});

		if (!media.success || !media.data) {
			return imageUrl;
		}

		return `/_emdash/api/media/file/${storageKey}`;
	} catch (error) {
		console.error(`Failed to import inline image for ${articleSlug}`, error);
		return imageUrl;
	}
}

async function importFeaturedImage(
	runtime: RuntimeLike,
	articleSlug: string,
	headline: string,
	imageUrl: string,
): Promise<Record<string, unknown> | string | null> {
	if (!imageUrl) return null;
	if (!runtime.storage) return imageUrl;

	try {
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return imageUrl;
		}

		const contentType = response.headers.get("content-type") || "image/jpeg";
		const bytes = await response.arrayBuffer();
		const extension = extensionForImage(imageUrl, contentType);
		const filename = `${articleSlug}${extension}`;
		const existing = await findExistingMediaByFilename(runtime.db, filename);
		if (existing) {
			return {
				provider: "local",
				id: existing.id,
				src: `/_emdash/api/media/file/${existing.storage_key}`,
				alt: headline,
				width: existing.width ?? undefined,
				height: existing.height ?? undefined,
				filename: existing.filename,
				mimeType: existing.mime_type,
				meta: {
					storageKey: existing.storage_key,
				},
			};
		}
		const storageKey = `${ulid()}${extension}`;

		await runtime.storage.upload({
			key: storageKey,
			body: new Uint8Array(bytes),
			contentType,
		});

		const media = await handleMediaCreate(runtime.db, {
			filename,
			mimeType: contentType,
			size: bytes.byteLength,
			alt: headline,
			storageKey,
		});

		if (!media.success || !media.data) {
			return imageUrl;
		}

		return {
			provider: "local",
			id: media.data.item.id,
			src: `/_emdash/api/media/file/${media.data.item.storageKey}`,
			alt: headline,
			width: media.data.item.width ?? undefined,
			height: media.data.item.height ?? undefined,
			filename: media.data.item.filename,
			mimeType: media.data.item.mimeType,
			meta: {
				storageKey: media.data.item.storageKey,
			},
		};
	} catch (error) {
		console.error(`Failed to import featured image for ${articleSlug}`, error);
		return imageUrl;
	}
}

async function localizeBodyHtmlImages(
	runtime: RuntimeLike,
	articleSlug: string,
	headline: string,
	bodyHtml: string,
): Promise<string> {
	if (!bodyHtml || !runtime.storage) return bodyHtml;
	const normalizedBodyHtml = normalizeDriveThruLinksInHtml(bodyHtml);

	const replacements = new Map<string, string>();
	let imageIndex = 0;

	for (const match of normalizedBodyHtml.matchAll(HTML_IMG_TAG_PATTERN)) {
		const sourceUrl = match[2];
		if (!sourceUrl || replacements.has(sourceUrl)) continue;
		imageIndex += 1;
		replacements.set(
			sourceUrl,
			await importImageUrlToLocal(runtime, articleSlug, headline, sourceUrl, imageIndex),
		);
	}

	return normalizedBodyHtml.replace(
		HTML_IMG_TAG_PATTERN,
		(fullMatch, quote: string, sourceUrl: string) => {
			const localized = replacements.get(sourceUrl);
			if (!localized || localized === sourceUrl) {
				return fullMatch;
			}

			return fullMatch.replace(`${quote}${sourceUrl}${quote}`, `${quote}${localized}${quote}`);
		},
	);
}

async function syncImportedPostTimestamps(
	db: Kysely<Database>,
	postId: string,
	createdAt: string,
	publishedAt: string,
	updatedAt: string,
): Promise<void> {
	await sql`
		UPDATE ${sql.ref("ec_posts")}
		SET
			created_at = ${createdAt},
			published_at = ${publishedAt},
			updated_at = ${updatedAt}
		WHERE id = ${postId}
	`.execute(db);
}

async function repairImportedPosts(runtime: RuntimeLike): Promise<number> {
	const repairTargets = await sql<{
		post_id: string;
		source_slug: string;
	}>`
		SELECT imports.post_id, imports.source_slug
		FROM ${sql.ref(IMPORT_TABLE)} AS imports
		INNER JOIN ${sql.ref("ec_posts")} AS posts
			ON posts.id = imports.post_id
		WHERE posts.body_html IS NULL
			OR trim(posts.body_html) = ''
			OR posts.body_html LIKE '%assets.seobotai.com%'
	`.execute(runtime.db);

	let repairedCount = 0;

	for (const target of repairTargets.rows) {
		try {
			const articleResult = await getSeobotArticle(target.source_slug);
			if (!articleResult.configured || articleResult.error || !articleResult.article) {
				continue;
			}

			const article = articleResult.article;
			const headline = getSeobotHeadline(article);
			const localizedBodyHtml = await localizeBodyHtmlImages(
				runtime,
				article.slug,
				headline,
				article.html || "",
			);
			const content = JSON.stringify(
				htmlToPortableText(localizedBodyHtml || article.html || `<p>${article.markdown || ""}</p>`),
			);

			await sql`
				UPDATE ${sql.ref("ec_posts")}
				SET
					body_html = ${localizedBodyHtml || null},
					content = ${content},
					excerpt = CASE
						WHEN excerpt IS NULL OR trim(excerpt) = '' THEN ${article.metaDescription || ""}
						ELSE excerpt
					END,
					updated_at = ${article.updatedAt || article.publishedAt || article.createdAt}
				WHERE id = ${target.post_id}
			`.execute(runtime.db);

			repairedCount += 1;
		} catch (error) {
			console.error(`Unexpected SEObot repair failure for ${target.source_slug}`, error);
		}
	}

	return repairedCount;
}

async function backfillImportedPostMetadata(runtime: RuntimeLike): Promise<number> {
	const targets = await sql<PostMetadataTargetRow>`
		SELECT imports.post_id, imports.source_slug
		FROM ${sql.ref(IMPORT_TABLE)} AS imports
		INNER JOIN ${sql.ref("ec_posts")} AS posts
			ON posts.id = imports.post_id
		WHERE posts.is_tool IS NULL
			OR (posts.is_tool = 1 AND (posts.tool_id IS NULL OR trim(posts.tool_id) = ''))
	`.execute(runtime.db);

	let updatedCount = 0;

	for (const target of targets.rows) {
		try {
			const articleResult = await getSeobotArticle(target.source_slug);
			if (!articleResult.configured || articleResult.error || !articleResult.article) {
				continue;
			}

			await syncImportedPostMetadata(
				runtime.db,
				target.post_id,
				getSeobotPostMetadata(articleResult.article),
			);
			updatedCount += 1;
		} catch (error) {
			console.error(`Unexpected SEObot metadata backfill failure for ${target.source_slug}`, error);
		}
	}

	return updatedCount;
}

export async function syncSeobotPosts(runtime: RuntimeLike): Promise<SeobotSyncResult> {
	const discovery = await discoverNewArticles(runtime.db);
	if (!discovery.configured || discovery.error) {
		return {
			configured: discovery.configured,
			importedCount: 0,
			repairedCount: 0,
			linkedCount: 0,
			skippedCount: 0,
			importedSlugs: [],
			error: discovery.error,
		};
	}

	let importedCount = 0;
	try {
		await backfillImportedPostMetadata(runtime);
	} catch (error) {
		console.error("Unexpected SEObot metadata backfill pass failure", error);
	}
	let repairedCount = 0;
	try {
		repairedCount = await repairImportedPosts(runtime);
	} catch (error) {
		console.error("Unexpected SEObot repair pass failure", error);
	}
	let linkedCount = 0;
	let skippedCount = 0;
	const importedSlugs: string[] = [];

	for (const articleIndex of discovery.articles) {
		try {
			const existing = await runtime.handleContentGet("posts", articleIndex.slug);
			if (existing.success && existing.data?.item) {
				await syncImportedPostMetadata(
					runtime.db,
					existing.data.item.id,
					getSeobotPostMetadata(articleIndex),
				);
				await recordImport(runtime.db, articleIndex.id, articleIndex.slug, existing.data.item.id);
				linkedCount += 1;
				continue;
			}

			const articleResult = await getSeobotArticle(articleIndex.slug);
			if (!articleResult.configured || articleResult.error || !articleResult.article) {
				skippedCount += 1;
				continue;
			}

			const article = articleResult.article;
			const headline = getSeobotHeadline(article);
			const localizedBodyHtml = await localizeBodyHtmlImages(
				runtime,
				article.slug,
				headline,
				article.html || "",
			);
			const featuredImage = await importFeaturedImage(runtime, article.slug, headline, article.image);

			const created = await runtime.handleContentCreate("posts", {
				slug: article.slug,
				status: "published",
				data: {
					title: headline,
					excerpt: article.metaDescription || "",
					content: htmlToPortableText(
						localizedBodyHtml || article.html || `<p>${article.markdown || ""}</p>`,
					),
					body_html: localizedBodyHtml || null,
					featured_image: featuredImage,
					...getSeobotPostMetadata(article),
				},
			});

			if (!created.success || !created.data?.item) {
				console.error(`Failed to import SEObot post ${article.slug}`, created.error);
				skippedCount += 1;
				continue;
			}

			await recordImport(runtime.db, article.id, article.slug, created.data.item.id);
			await syncImportedPostTimestamps(
				runtime.db,
				created.data.item.id,
				article.createdAt,
				article.publishedAt || article.createdAt,
				article.updatedAt || article.publishedAt || article.createdAt,
			);

			importedCount += 1;
			importedSlugs.push(article.slug);
		} catch (error) {
			console.error(`Unexpected SEObot import failure for ${articleIndex.slug}`, error);
			skippedCount += 1;
		}
	}

	return {
		configured: true,
		importedCount,
		repairedCount,
		linkedCount,
		skippedCount,
		importedSlugs,
		error: null,
	};
}

export async function syncSeobotPostsIfDue(runtime: RuntimeLike): Promise<SeobotSyncDueResult> {
	const claimed = await claimDueSync(runtime.db);
	if (!claimed) {
		return {
			triggered: false,
			result: null,
		};
	}

	let result: SeobotSyncResult;
	try {
		result = await syncSeobotPosts(runtime);
	} catch (error) {
		result = {
			configured: true,
			importedCount: 0,
			repairedCount: 0,
			linkedCount: 0,
			skippedCount: 0,
			importedSlugs: [],
			error: error instanceof Error ? error.message : "SEObot sync failed.",
		};
	}

	await finalizeDueSync(runtime.db, result);

	return {
		triggered: true,
		result,
	};
}
