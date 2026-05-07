import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

import { compactMarkdown, listSection, postSummaryLine } from "../lib/markdown-content.js";
import { createMarkdownResponse } from "../lib/markdown.js";
import { getPostPath, isToolPost } from "../lib/post-routes.js";
import { filterPostEntries } from "../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const { entries } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 500,
	});
	const posts = filterPostEntries(entries).filter((post) => !isToolPost(post));

	return createMarkdownResponse(
		compactMarkdown([
			"# TTRPG Games Blog",
			"Editorial articles about tabletop RPG discovery, play styles, tools, and choosing the right game for a table.",
			listSection(
				"Articles",
				posts.map((post) => postSummaryLine(url.origin, post, getPostPath(post.id))),
			),
		]),
	);
};
