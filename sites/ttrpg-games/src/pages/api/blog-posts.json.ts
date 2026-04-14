import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

import { getPostPath } from "../../lib/post-routes";
import type { PostEntry } from "../../lib/types";

export const prerender = false;

const PAGE_SIZE = 24;
const ALL_POSTS_LIMIT = 500;

function formatDate(date: Date | string | null | undefined): string | null {
	if (!date) return null;

	const parsed = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(parsed.getTime())) return null;

	return parsed.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

function getImageData(image: unknown): { src: string; alt: string } | null {
	if (!image || typeof image !== "object") return null;

	const media = image as {
		src?: string;
		alt?: string;
		id?: string;
		meta?: { storageKey?: string };
	};

	const src =
		media.src ||
		(typeof media.meta?.storageKey === "string" && media.meta.storageKey
			? `/_emdash/api/media/file/${media.meta.storageKey}`
			: typeof media.id === "string" && media.id
				? `/_emdash/api/media/file/${media.id}`
				: null);

	if (!src) return null;

	return {
		src,
		alt: media.alt || "",
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isPostEntry(value: unknown): value is PostEntry {
	if (!isRecord(value) || typeof value.id !== "string" || !isRecord(value.data)) {
		return false;
	}

	return typeof value.data.title === "string";
}

export const GET: APIRoute = async ({ url }) => {
	const rawOffset = Number.parseInt(url.searchParams.get("offset") || "0", 10);
	const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

	const { entries: rawPosts, error } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: ALL_POSTS_LIMIT,
	});

	if (error) {
		return Response.json({ error: "Failed to load blog posts." }, { status: 500 });
	}

	const allPosts = rawPosts.filter(isPostEntry);
	const pagePosts = allPosts.slice(offset, offset + PAGE_SIZE);
	const items = pagePosts.map((post) => {
		const image = getImageData(post.data.featured_image);
		return {
			slug: post.id,
			href: getPostPath(post.id),
			title: post.data.title,
			excerpt: post.data.excerpt || "",
			publishedLabel: formatDate(post.data.publishedAt),
			image,
		};
	});

	return Response.json({
		items,
		nextOffset: allPosts.length > offset + PAGE_SIZE ? offset + PAGE_SIZE : null,
	});
};
