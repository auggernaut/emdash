import { describe, expect, it } from "vitest";

import {
	buildArticlePageStructuredData,
	buildCategoryPageStructuredData,
	buildHomePageStructuredData,
} from "./structured-data.js";
import type { CategoryFaq, GameEntry } from "./types.js";

const sampleGames: GameEntry[] = [
	{
		id: "slugged-game",
		data: {
			id: "01TEST",
			title: "Slugged Game",
			image_url: "https://example.com/game.webp",
		},
	},
];

describe("structured data builders", () => {
	it("adds a SearchAction to the homepage website schema", () => {
		const structuredData = buildHomePageStructuredData({
			origin: "https://ttrpg.games",
			description: "Find tabletop RPGs by fit.",
			faqs: [],
		});

		expect(structuredData[0]).toMatchObject({
			"@type": "WebSite",
			potentialAction: {
				"@type": "SearchAction",
				target: {
					urlTemplate: "https://ttrpg.games/search?q={search_term_string}",
				},
				"query-input": "required name=search_term_string",
			},
		});
	});

	it("adds FAQ schema to the homepage when FAQs are present", () => {
		const structuredData = buildHomePageStructuredData({
			origin: "https://ttrpg.games",
			description: "Find tabletop RPGs by fit.",
			faqs: [{ question: "What is TTRPG Games?", answer: "A curated directory." }],
		});

		expect(structuredData).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					"@type": "FAQPage",
					mainEntity: [
						expect.objectContaining({
							"@type": "Question",
							name: "What is TTRPG Games?",
						}),
					],
				}),
			]),
		);
	});

	it("builds collection, item list, and FAQ schema for category pages", () => {
		const faqs: CategoryFaq[] = [{ question: "What is this?", answer: "A category page." }];
		const structuredData = buildCategoryPageStructuredData({
			origin: "https://ttrpg.games",
			url: "https://ttrpg.games/category/solo-play",
			name: "Solo Play",
			description: "Games for solo sessions.",
			breadcrumbs: [
				{ name: "Home", url: "https://ttrpg.games/" },
				{ name: "Categories", url: "https://ttrpg.games/categories" },
				{ name: "Solo Play", url: "https://ttrpg.games/category/solo-play" },
			],
			games: sampleGames,
			faqs,
		});

		expect(structuredData).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ "@type": "CollectionPage" }),
				expect.objectContaining({
					"@type": "ItemList",
					numberOfItems: 1,
				}),
				expect.objectContaining({
					"@type": "FAQPage",
					mainEntity: [
						expect.objectContaining({
							"@type": "Question",
							name: "What is this?",
						}),
					],
				}),
			]),
		);
	});

	it("builds breadcrumb schema for article pages", () => {
		const structuredData = buildArticlePageStructuredData({
			breadcrumbs: [
				{ name: "Home", url: "https://ttrpg.games/" },
				{ name: "Blog", url: "https://ttrpg.games/blog" },
				{ name: "Article", url: "https://ttrpg.games/blog/article" },
			],
		});

		expect(structuredData).toEqual([
			expect.objectContaining({
				"@type": "BreadcrumbList",
				itemListElement: [
					expect.objectContaining({ position: 1 }),
					expect.objectContaining({ position: 2 }),
					expect.objectContaining({ position: 3 }),
				],
			}),
		]);
	});
});
