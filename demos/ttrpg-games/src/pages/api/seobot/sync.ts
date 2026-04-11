import { fileURLToPath } from "node:url";

import type { APIRoute } from "astro";
import { handleContentCreate, handleContentGet, type Database } from "emdash";
import { createDialect } from "emdash/db/sqlite";
import { LocalStorage } from "emdash/storage/local";
import { Kysely } from "kysely";

import { syncSeobotPosts } from "../../../lib/seobot-sync";

export const prerender = false;

function isLocalDevRequest(request: Request): boolean {
	if (!import.meta.env.DEV) return false;
	const url = new URL(request.url);
	return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function isAuthorized(request: Request): boolean {
	const configuredSecret =
		import.meta.env.EMDASH_SEOBOT_SYNC_SECRET || import.meta.env.SEOBOT_SYNC_SECRET || "";

	if (!configuredSecret) {
		return isLocalDevRequest(request);
	}

	const authHeader = request.headers.get("authorization");
	const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
	const headerSecret = request.headers.get("x-seobot-sync-secret");

	return bearer === configuredSecret || headerSecret === configuredSecret;
}

export const POST: APIRoute = async ({ request, cache }) => {
	if (!isAuthorized(request)) {
		return Response.json({ error: "Unauthorized." }, { status: 401 });
	}

	const dbPath = fileURLToPath(new URL("../../../../data.db", import.meta.url));
	const uploadDirectory = fileURLToPath(new URL("../../../../uploads", import.meta.url));
	const db = new Kysely<Database>({
		dialect: createDialect({ url: `file:${dbPath}` }),
	});
	const storage = new LocalStorage({
		directory: uploadDirectory,
		baseUrl: "/_emdash/api/media/file",
	});

	const result = await syncSeobotPosts({
		db,
		storage,
		handleContentCreate: (collection, body) => handleContentCreate(db, collection, body),
		handleContentGet: (collection, id, locale) => handleContentGet(db, collection, id, locale),
	});

	await db.destroy();

	if (result.error) {
		return Response.json(result, { status: result.configured ? 502 : 500 });
	}

	if (result.importedCount > 0 && cache.enabled) {
		await cache.invalidate({ tags: ["posts"] });
	}

	return Response.json(result);
};
