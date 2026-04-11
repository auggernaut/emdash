import { BlogClient } from "seobot";
import type { IArticle, IArticleIndex } from "seobot/dist/types/blog";

const DEFAULT_PAGE_SIZE = 12;

type SeobotListResult = {
	articles: IArticleIndex[];
	total: number;
	configured: boolean;
	error: string | null;
};

type SeobotArticleResult = {
	article: IArticle | null;
	configured: boolean;
	error: string | null;
};

function getSeobotApiKey(): string {
	return import.meta.env.EMDASH_SEOBOT_API_KEY || import.meta.env.SEOBOT_API_KEY || "";
}

function getSeobotClient(): BlogClient | null {
	const apiKey = getSeobotApiKey();
	return apiKey ? new BlogClient(apiKey) : null;
}

export function getSeobotHeadline(
	article: Pick<IArticle, "headline" | "title"> | Pick<IArticleIndex, "headline" | "title">,
): string {
	return article.headline || article.title;
}

export function formatSeobotDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

export function getBlogPageHref(page: number): string {
	return page <= 1 ? "/blog" : `/blog?page=${page}`;
}

export async function getSeobotArticles(
	page = 0,
	limit = DEFAULT_PAGE_SIZE,
): Promise<SeobotListResult> {
	const client = getSeobotClient();
	if (!client) {
		return {
			articles: [],
			total: 0,
			configured: false,
			error: "The editorial blog is not configured yet.",
		};
	}

	try {
		const result = await client.getArticles(page, limit);
		return {
			articles: result.articles,
			total: result.total,
			configured: true,
			error: null,
		};
	} catch (error) {
		console.error("Failed to load SEObot article index", error);
		return {
			articles: [],
			total: 0,
			configured: true,
			error: "The editorial blog is temporarily unavailable.",
		};
	}
}

export async function getSeobotArticle(slug: string): Promise<SeobotArticleResult> {
	const client = getSeobotClient();
	if (!client) {
		return {
			article: null,
			configured: false,
			error: "The editorial blog is not configured yet.",
		};
	}

	try {
		const article = await client.getArticle(slug);
		return {
			article,
			configured: true,
			error: article ? null : "Article not found.",
		};
	} catch (error) {
		console.error(`Failed to load SEObot article "${slug}"`, error);
		return {
			article: null,
			configured: true,
			error: "The article could not be loaded.",
		};
	}
}
