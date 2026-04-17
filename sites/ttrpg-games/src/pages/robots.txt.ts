import type { APIRoute } from "astro";

import { buildRobotsTxt } from "../lib/search-indexing.js";

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
	new Response(buildRobotsTxt(url.origin, url.hostname), {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
