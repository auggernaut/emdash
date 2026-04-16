import type { CategoryFaq, GameEntry } from "./types.js";

export const SITE_NAME = "TTRPG Games Directory";
export const SITE_FAVICON_PATH = "/favicon.svg";
export const SITE_LOGO_PATH = "/images/logo-red-transparent-cropped.png";

interface BreadcrumbItem {
	name: string;
	url: string;
}

interface GameItemListOptions {
	id: string;
	name: string;
	url: string;
	games: GameEntry[];
}

interface CategoryPageOptions {
	origin: string;
	url: string;
	name: string;
	description?: string | null;
	breadcrumbs: BreadcrumbItem[];
	games: GameEntry[];
	faqs: CategoryFaq[];
}

interface HomePageOptions {
	origin: string;
	description: string;
	faqs: CategoryFaq[];
}

interface ArticlePageOptions {
	breadcrumbs: BreadcrumbItem[];
}

function buildQuestionAnswerStructuredData(faqs: CategoryFaq[]): Array<Record<string, unknown>> {
	return faqs.map((faq) => ({
		"@type": "Question",
		name: faq.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: faq.answer,
		},
	}));
}

export function buildBreadcrumbStructuredData(
	breadcrumbs: BreadcrumbItem[],
): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: breadcrumbs.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
}

export function buildGameItemListStructuredData({
	id,
	name,
	url,
	games,
}: GameItemListOptions): Record<string, unknown> {
	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		"@id": id,
		name,
		url,
		numberOfItems: games.length,
		itemListOrder: "https://schema.org/ItemListOrderAscending",
		itemListElement: games.map((game, index) => {
			const itemUrl = new URL(`/item/${encodeURIComponent(game.id)}`, url).href;
			return {
				"@type": "ListItem",
				position: index + 1,
				url: itemUrl,
				name: game.data.title,
				item: {
					"@id": itemUrl,
					"@type": "Game",
					name: game.data.title,
					url: itemUrl,
					image: game.data.image_url ?? undefined,
				},
			};
		}),
	};
}

export function buildHomePageStructuredData({
	origin,
	description,
	faqs,
}: HomePageOptions): Record<string, unknown>[] {
	const websiteId = `${origin}/#website`;
	const organizationId = `${origin}/#organization`;
	const data: Record<string, unknown>[] = [
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"@id": websiteId,
			name: SITE_NAME,
			description,
			url: origin,
			publisher: { "@id": organizationId },
			potentialAction: {
				"@type": "SearchAction",
				target: {
					"@type": "EntryPoint",
					urlTemplate: `${origin}/search?q={search_term_string}`,
				},
				"query-input": "required name=search_term_string",
			},
		},
		{
			"@context": "https://schema.org",
			"@type": "Organization",
			"@id": organizationId,
			name: SITE_NAME,
			url: origin,
			logo: {
				"@type": "ImageObject",
				url: new URL(SITE_LOGO_PATH, origin).href,
			},
		},
	];

	if (faqs.length > 0) {
		data.push({
			"@context": "https://schema.org",
			"@type": "FAQPage",
			"@id": `${origin}/#faq`,
			mainEntity: buildQuestionAnswerStructuredData(faqs),
			isPartOf: { "@id": websiteId },
		});
	}

	return data;
}

export function buildCategoryPageStructuredData({
	origin,
	url,
	name,
	description,
	breadcrumbs,
	games,
	faqs,
}: CategoryPageOptions): Record<string, unknown>[] {
	const collectionPageId = `${url}#webpage`;
	const itemListId = `${url}#games`;
	const data: Record<string, unknown>[] = [
		buildBreadcrumbStructuredData(breadcrumbs),
		{
			"@context": "https://schema.org",
			"@type": "CollectionPage",
			"@id": collectionPageId,
			name,
			description: description ?? undefined,
			url,
			isPartOf: { "@id": `${origin}/#website` },
			mainEntity: { "@id": itemListId },
		},
		buildGameItemListStructuredData({
			id: itemListId,
			name: `Best ${name} TTRPGs`,
			url,
			games,
		}),
	];

	if (faqs.length > 0) {
		data.push({
			"@context": "https://schema.org",
			"@type": "FAQPage",
			"@id": `${url}#faq`,
			mainEntity: buildQuestionAnswerStructuredData(faqs),
			isPartOf: { "@id": collectionPageId },
		});
	}

	return data;
}

export function buildArticlePageStructuredData({
	breadcrumbs,
}: ArticlePageOptions): Record<string, unknown>[] {
	return [buildBreadcrumbStructuredData(breadcrumbs)];
}
