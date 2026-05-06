import type { APIRoute } from "astro";
import { getEmDashEntry } from "emdash";

import {
	compactMarkdown,
	formatMarkdownDate,
	postBodyMarkdown,
	section,
} from "../../lib/markdown-content.js";
import { createMarkdownResponse } from "../../lib/markdown.js";
import { isToolPost } from "../../lib/post-routes.js";
import type { PostEntry } from "../../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
	const slug = params.slug;
	if (!slug) return createMarkdownResponse("# Article Not Found\n", { status: 404 });

	const { entry } = await getEmDashEntry("posts", slug);
	const post = entry as unknown as PostEntry | null;
	if (!post) return createMarkdownResponse("# Article Not Found\n", { status: 404 });
	if (isToolPost(post)) {
		return Response.redirect(new URL(`/tools/${encodeURIComponent(post.id)}.md`, url).href, 308);
	}

	const dates = [
		formatMarkdownDate(post.data.publishedAt)
			? `Published: ${formatMarkdownDate(post.data.publishedAt)}`
			: null,
		formatMarkdownDate(post.data.updatedAt)
			? `Updated: ${formatMarkdownDate(post.data.updatedAt)}`
			: null,
	]
		.filter(Boolean)
		.join("\n");

	return createMarkdownResponse(
		compactMarkdown([
			`# ${post.data.title}`,
			dates,
			post.data.excerpt,
			section("Article", postBodyMarkdown(post)),
		]),
	);
};
