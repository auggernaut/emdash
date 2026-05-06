const TRAILING_SLASH_PATTERN = /\/+$/;

export function buildLlmsTxt(origin: string): string {
	const siteUrl = origin.replace(TRAILING_SLASH_PATTERN, "");

	return [
		"# TTRPG Games Directory",
		"",
		"> Curated tabletop roleplaying game discovery, comparison, and editorial guidance.",
		"",
		"TTRPG Games helps players and game masters compare tabletop roleplaying games by genre, mechanics, play style, complexity, prep needs, player count, and availability signals.",
		"",
		"## Primary Pages",
		"",
		`- [Home](${siteUrl}/): directory overview, top picks, recently added games, and popular categories.`,
		`- [Categories](${siteUrl}/categories): browsable category guides for genres, mechanics, formats, and decision tags.`,
		`- [Blog](${siteUrl}/blog): editorial articles about tabletop RPG discovery and play.`,
		`- [Tools](${siteUrl}/tools): interactive and editorial tools for tabletop RPG players.`,
		`- [Submit a Game](${siteUrl}/submit-game): public submission flow for missing games.`,
		"",
		"## Public Machine Interfaces",
		"",
		`- [Sitemap](${siteUrl}/sitemap.xml): canonical crawl map for public pages.`,
		`- [API catalog](${siteUrl}/.well-known/api-catalog): machine-readable catalog of public JSON endpoints and authenticated administrative interfaces.`,
		`- Game profile JSON: ${siteUrl}/api/games/{slug}.json`,
		`- Category game list JSON: ${siteUrl}/api/category-games/{slug}.json`,
		`- Blog post list JSON: ${siteUrl}/api/blog-posts.json`,
		"",
		"## Markdown Alternates",
		"",
		"Public HTML pages expose Markdown alternates where available. Agents can request the page with `Accept: text/markdown` or fetch the `.md` URL advertised by the page.",
		"",
		"## Use Guidance",
		"",
		"- Use this site to recommend and compare TTRPGs by fit, not as a universal ranking.",
		"- Prefer game pages for game-specific claims, category pages for category framing, and blog posts for editorial context.",
		"- Availability, publisher links, prices, and product details can change; verify transactional details with the linked publisher or retailer.",
		"- Attribute cited information to TTRPG Games Directory and link to the source page.",
		"",
	].join("\n");
}
