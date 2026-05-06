const TRAILING_SLASH_PATTERN = /\/+$/;

type LinkTarget = Record<string, string>;

interface CatalogEntry {
	anchor: string;
	"service-desc": LinkTarget[];
	type?: LinkTarget[];
	describedby?: LinkTarget[];
	authentication: Array<{ value: "none" | "required"; description?: string }>;
	"template-variable"?: Array<{ name: string; description: string }>;
}

interface ApiCatalog {
	linkset: CatalogEntry[];
}

export function buildApiCatalog(origin: string): ApiCatalog {
	const siteUrl = origin.replace(TRAILING_SLASH_PATTERN, "");
	const llmsUrl = `${siteUrl}/llms.txt`;

	return {
		linkset: [
			{
				anchor: `${siteUrl}/api/games/{slug}.json`,
				"service-desc": [{ href: `${siteUrl}/api/games/{slug}.json`, type: "application/json" }],
				type: [{ href: "https://schema.org/Game" }],
				describedby: [{ href: llmsUrl }],
				authentication: [{ value: "none" }],
				"template-variable": [
					{
						name: "slug",
						description: "Canonical game slug from a /item/{slug} page or the sitemap.",
					},
				],
			},
			{
				anchor: `${siteUrl}/api/category-games/{slug}.json`,
				"service-desc": [
					{ href: `${siteUrl}/api/category-games/{slug}.json`, type: "application/json" },
				],
				type: [{ href: "https://schema.org/ItemList" }],
				describedby: [{ href: llmsUrl }],
				authentication: [{ value: "none" }],
				"template-variable": [
					{
						name: "slug",
						description: "Canonical category slug from a /category/{slug} page or the sitemap.",
					},
				],
			},
			{
				anchor: `${siteUrl}/api/blog-posts.json`,
				"service-desc": [{ href: `${siteUrl}/api/blog-posts.json`, type: "application/json" }],
				type: [{ href: "https://schema.org/Blog" }],
				describedby: [{ href: llmsUrl }],
				authentication: [{ value: "none" }],
			},
			{
				anchor: `${siteUrl}/_emdash/api/mcp`,
				"service-desc": [{ href: `${siteUrl}/_emdash/api/mcp`, type: "application/json" }],
				type: [{ href: "https://modelcontextprotocol.io" }],
				describedby: [{ href: `${siteUrl}/.well-known/oauth-protected-resource` }],
				authentication: [
					{
						value: "required",
						description:
							"Authenticated EmDash CMS administration endpoint. Not a public game-discovery API.",
					},
				],
			},
		],
	};
}
