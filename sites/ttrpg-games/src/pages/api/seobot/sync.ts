import type { APIRoute } from "astro";
import { handleContentCreate, handleContentGet } from "emdash";
import { getDb } from "emdash/runtime";
import { createStorage as createR2Storage } from "@emdash-cms/cloudflare/storage/r2";

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

export const POST: APIRoute = async ({ request, cache, locals }) => {
	if (!isAuthorized(request)) {
		return Response.json({ error: "Unauthorized." }, { status: 401 });
	}

	try {
		const db = locals.emdash?.db ?? (await getDb());
		const storage = locals.emdash?.storage ?? createR2Storage({ binding: "MEDIA" });

		const result = await syncSeobotPosts({
			db,
			storage,
			handleContentCreate: (collection, body) => handleContentCreate(db, collection, body),
			handleContentGet: (collection, id, locale) => handleContentGet(db, collection, id, locale),
		});

		if (result.error) {
			return Response.json(result, { status: result.configured ? 502 : 500 });
		}

		if (result.importedCount > 0 && cache.enabled) {
			try {
				await cache.invalidate({ tags: ["posts"] });
			} catch (error) {
				console.error("Failed to invalidate blog cache after SEObot sync", error);
			}
		}

		return Response.json(result);
	} catch (error) {
		console.error("Unhandled SEObot sync failure", error);
		return Response.json(
			{
				configured: true,
				importedCount: 0,
				repairedCount: 0,
				linkedCount: 0,
				skippedCount: 0,
				importedSlugs: [],
				error: error instanceof Error ? error.message : "SEObot sync failed.",
			},
			{ status: 502 },
		);
	}
};
