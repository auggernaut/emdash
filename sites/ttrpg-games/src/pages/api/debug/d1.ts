import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { sql } from "kysely";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	if (!import.meta.env.DEV) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}

	const emdash = locals.emdash;
	const result: Record<string, unknown> = {
		timestamp: new Date().toISOString(),
	};

	try {
		const rawStart = Date.now();
		const rawVersion = await env.DB.prepare("select sqlite_version() as version").first<{
			version: string;
		}>();
		const rawCollections = await env.DB.prepare(
			"select count(*) as count from _emdash_collections",
		).first<{ count: number }>();

		result.raw = {
			ok: true,
			durationMs: Date.now() - rawStart,
			sqliteVersion: rawVersion?.version ?? null,
			collectionsCount: rawCollections?.count ?? null,
		};
	} catch (error) {
		result.raw = {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	try {
		if (!emdash?.db) {
			throw new Error("EmDash DB is not available on locals");
		}

		const kyselyStart = Date.now();
		const versionRow = await sql<{ version: string }>`select sqlite_version() as version`.execute(
			emdash.db,
		);
		const collectionRow = await emdash.db
			.selectFrom("_emdash_collections")
			.select((eb) => eb.fn.countAll<number>().as("count"))
			.executeTakeFirst();

		result.kysely = {
			ok: true,
			durationMs: Date.now() - kyselyStart,
			sqliteVersion: versionRow.rows[0]?.version ?? null,
			collectionsCount: collectionRow?.count ?? null,
		};
	} catch (error) {
		result.kysely = {
			ok: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}

	return Response.json(result);
};
