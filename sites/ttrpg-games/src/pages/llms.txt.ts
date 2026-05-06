import type { APIRoute } from "astro";

import { buildLlmsTxt } from "../lib/llms.js";

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
	new Response(buildLlmsTxt(url.origin), {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
