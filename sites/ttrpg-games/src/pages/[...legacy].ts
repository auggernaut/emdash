import type { APIRoute } from "astro";

import { getLegacyRedirectPathForPathname } from "../lib/legacy-routes.js";

export const prerender = false;

const redirectLegacyPath: APIRoute = async ({ redirect, rewrite, url }) => {
	const legacyRedirectPath = getLegacyRedirectPathForPathname(url.pathname);
	if (!legacyRedirectPath) {
		const response = await rewrite("/404");
		return new Response(response.body, {
			headers: response.headers,
			status: 404,
			statusText: "Not Found",
		});
	}

	const redirectPath = legacyRedirectPath.includes("?")
		? legacyRedirectPath
		: `${legacyRedirectPath}${url.search}`;
	return redirect(redirectPath, 308);
};

export const GET = redirectLegacyPath;
export const HEAD = redirectLegacyPath;
