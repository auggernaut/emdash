import type { APIRoute } from "astro";
import { getSiteSettings } from "emdash";
import { getDb } from "emdash/runtime";
import { sql } from "kysely";

import { latestSitemapLastmod, normalizeSitemapLastmod } from "../lib/sitemap.js";
import { getPostPath } from "../lib/post-routes";

export const prerender = false;

interface DynamicSitemapRow {
	slug: string | null;
	updated_at: string;
	is_tool?: number | null;
}

interface SitemapUrlEntry {
	path: string;
	lastmod: string;
	changefreq?: "daily" | "weekly" | "monthly";
	priority?: number;
}

const TRAILING_SLASH_RE = /\/$/;
const AMP_RE = /&/g;
const LT_RE = /</g;
const GT_RE = />/g;
const QUOT_RE = /"/g;
const APOS_RE = /'/g;

async function fetchDynamicRows(
	collection: "games" | "category_pages" | "posts",
): Promise<DynamicSitemapRow[]> {
	const db = await getDb();

	const rows = await sql<DynamicSitemapRow>`
		SELECT c.slug, c.updated_at, ${collection === "posts" ? sql.raw("c.is_tool") : sql`NULL`} AS is_tool
		FROM ${sql.ref(`ec_${collection}`)} c
		LEFT JOIN _emdash_seo s
			ON s.collection = ${collection}
			AND s.content_id = c.id
		WHERE c.status = 'published'
		AND c.deleted_at IS NULL
		AND (s.seo_no_index IS NULL OR s.seo_no_index = 0)
		ORDER BY c.updated_at DESC
	`.execute(db);

	return rows.rows;
}

function escapeXml(str: string): string {
	return str
		.replace(AMP_RE, "&amp;")
		.replace(LT_RE, "&lt;")
		.replace(GT_RE, "&gt;")
		.replace(QUOT_RE, "&quot;")
		.replace(APOS_RE, "&apos;");
}

function toAbsoluteUrl(siteUrl: string, path: string): string {
	const normalizedPath = path === "/" ? "/" : path.replace(TRAILING_SLASH_RE, "");
	return normalizedPath === "/" ? siteUrl : `${siteUrl}${normalizedPath}`;
}

function latestUpdatedAt(...groups: DynamicSitemapRow[][]): string {
	const values = groups.flatMap((group) => group.map((row) => row.updated_at)).filter(Boolean);
	return latestSitemapLastmod(values);
}

function buildSitemapXml(siteUrl: string, entries: SitemapUrlEntry[]): string {
	const lines = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
	];

	for (const entry of entries) {
		lines.push("  <url>");
		lines.push(`    <loc>${escapeXml(toAbsoluteUrl(siteUrl, entry.path))}</loc>`);
		lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
		if (entry.changefreq) {
			lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
		}
		if (typeof entry.priority === "number") {
			lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
		}
		lines.push("  </url>");
	}

	lines.push("</urlset>");

	return lines.join("\n");
}

export const GET: APIRoute = async ({ url }) => {
	try {
		const [settings, games, categoryPages, posts] = await Promise.all([
			getSiteSettings(),
			fetchDynamicRows("games"),
			fetchDynamicRows("category_pages"),
			fetchDynamicRows("posts"),
		]);

		const siteUrl = (settings.url || url.origin).replace(TRAILING_SLASH_RE, "");
		const defaultLastmod = latestUpdatedAt(games, categoryPages, posts);
		const toolPosts = posts.filter((row) => row.slug && row.is_tool === 1);

			const entries: SitemapUrlEntry[] = [
				{ path: "/", lastmod: defaultLastmod, changefreq: "daily", priority: 1.0 },
			{
				path: "/categories",
				lastmod: latestUpdatedAt(categoryPages),
				changefreq: "weekly",
				priority: 0.8,
			},
			{ path: "/blog", lastmod: latestUpdatedAt(posts), changefreq: "daily", priority: 0.8 },
			...(toolPosts.length > 0
				? [
						{
							path: "/tools",
							lastmod: latestUpdatedAt(toolPosts),
							changefreq: "daily" as const,
							priority: 0.8,
						},
					]
				: []),
				...categoryPages
					.filter((row) => row.slug)
					.map((row) => ({
						path: `/category/${encodeURIComponent(row.slug!)}`,
						lastmod: normalizeSitemapLastmod(row.updated_at),
						changefreq: "weekly" as const,
						priority: 0.7,
					})),
				...games
					.filter((row) => row.slug)
					.map((row) => ({
						path: `/item/${encodeURIComponent(row.slug!)}`,
						lastmod: normalizeSitemapLastmod(row.updated_at),
						changefreq: "weekly" as const,
						priority: 0.7,
					})),
				...posts
					.filter((row) => row.slug)
					.map((row) => ({
						path: getPostPath(row.slug!, row.is_tool === 1),
						lastmod: normalizeSitemapLastmod(row.updated_at),
						changefreq: "weekly" as const,
						priority: 0.7,
					})),
		];

		return new Response(buildSitemapXml(siteUrl, entries), {
			status: 200,
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		});
	} catch {
		return new Response("<!-- Failed to generate sitemap -->", {
			status: 500,
			headers: { "Content-Type": "application/xml" },
		});
	}
};
