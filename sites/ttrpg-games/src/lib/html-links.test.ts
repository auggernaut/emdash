import { describe, expect, it } from "vitest";

import { normalizeInternalHtmlLinks } from "./html-links.js";

describe("normalizeInternalHtmlLinks", () => {
	it("removes internal trailing slashes", () => {
		expect(normalizeInternalHtmlLinks('<a href="/item/dungeonworld/">Dungeon World</a>')).toBe(
			'<a href="/item/dungeonworld">Dungeon World</a>',
		);
	});

	it("rewrites legacy item and category links", () => {
		expect(
			normalizeInternalHtmlLinks(
				'<a href="/item/alien">Alien</a> <a href="/category/forged-in-the-dark/">FitD</a>',
			),
		).toBe(
			'<a href="/item/alienrpg">Alien</a> <a href="/category/forged-in-the-dark-fitd">FitD</a>',
		);
	});

	it("rewrites legacy blog links and tool post links", () => {
		const toolSlugs = new Set(["tabletop-rpg-dice-roller"]);
		expect(
			normalizeInternalHtmlLinks(
				'<a href="/blog/top-10-rules-light-ttrpgs-that-are-perfect-for-quick-game-nights/">Rules</a> <a href="/blog/tabletop-rpg-dice-roller">Dice</a>',
				{ toolSlugs },
			),
		).toBe(
			'<a href="/blog/rules-light-ttrpgs-perfect-quick-game-nights">Rules</a> <a href="/tools/tabletop-rpg-dice-roller">Dice</a>',
		);
	});

	it("leaves external links untouched", () => {
		expect(normalizeInternalHtmlLinks('<a href="https://example.com/item/alien/">Alien</a>')).toBe(
			'<a href="https://example.com/item/alien/">Alien</a>',
		);
	});

	it("normalizes absolute internal links to relative canonical links", () => {
		expect(
			normalizeInternalHtmlLinks(
				'<a href="https://ttrpg-games.com/">Home</a> <a href="https://www.ttrpg-games.com/item/alien/">Alien</a>',
			),
		).toBe('<a href="/">Home</a> <a href="/item/alienrpg">Alien</a>');
	});

	it("fills missing and empty image alt text with the page title", () => {
		expect(
			normalizeInternalHtmlLinks('<img src="/cover.webp"><img src="/map.webp" alt="">', {
				imageAlt: 'Blades & "Ghosts"',
			}),
		).toBe(
			'<img src="/cover.webp" alt="Blades &amp; &quot;Ghosts&quot;"><img src="/map.webp" alt="Blades &amp; &quot;Ghosts&quot;">',
		);
	});
});
