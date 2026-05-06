import type { APIRoute } from "astro";

import { buildApiCatalog } from "../../lib/api-catalog.js";

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
	Response.json(buildApiCatalog(url.origin), {
		status: 200,
		headers: {
			"Content-Type": "application/linkset+json; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
