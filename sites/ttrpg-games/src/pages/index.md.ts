import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";

import { sortRecentlyAddedGames } from "../lib/home-page-games.js";
import {
	categorySummaryLine,
	compactMarkdown,
	gameSummaryLine,
	listSection,
	postSummaryLine,
} from "../lib/markdown-content.js";
import { createMarkdownResponse } from "../lib/markdown.js";
import { getPostPath, isToolPost } from "../lib/post-routes.js";
import type { CategoryPageEntry, GameEntry, PostEntry } from "../lib/types.js";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const [{ entries: rawGames }, { entries: rawCategoryPages }, { entries: rawPosts }] =
		await Promise.all([
			getEmDashCollection("games"),
			getEmDashCollection("category_pages"),
			getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 500 }),
		]);

	const games = rawGames as unknown as GameEntry[];
	const categories = rawCategoryPages as unknown as CategoryPageEntry[];
	const posts = rawPosts as unknown as PostEntry[];
	const articles = posts.filter((post) => !isToolPost(post));
	const tools = posts.filter((post) => isToolPost(post));
	const topRatedGames = games.filter((game) => game.data.is_top_rated).slice(0, 10);
	const recentlyAddedGames = sortRecentlyAddedGames(games).slice(0, 10);
	const popularCategories = categories
		.toSorted((left, right) => left.data.title.localeCompare(right.data.title))
		.slice(0, 12);

	return createMarkdownResponse(
		compactMarkdown([
			"# TTRPG Games Directory",
			"Compare TTRPGs, explore category guides, and find the game that best fits your group, campaign style, and taste.",
			listSection(
				"Top Rated Games",
				topRatedGames.map((game) => gameSummaryLine(url.origin, game)),
			),
			listSection(
				"Recently Added Games",
				recentlyAddedGames.map((game) => gameSummaryLine(url.origin, game)),
			),
			listSection(
				"Popular Categories",
				popularCategories.map((category) => categorySummaryLine(url.origin, category)),
			),
			listSection(
				"Recent Articles",
				articles.slice(0, 8).map((post) => postSummaryLine(url.origin, post, getPostPath(post.id))),
			),
			listSection(
				"Tools",
				tools.slice(0, 8).map((post) => postSummaryLine(url.origin, post, getPostPath(post.id))),
			),
		]),
	);
};
