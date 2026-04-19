import { defineMiddleware } from "astro:middleware";

const TRAILING_SLASH_PATTERN = /\/+$/;

export const onRequest = defineMiddleware(async (context, next) => {
	if (
		(context.request.method === "GET" || context.request.method === "HEAD") &&
		context.url.pathname.length > 1 &&
		context.url.pathname.endsWith("/") &&
		!context.url.pathname.startsWith("/_emdash/")
	) {
		const normalizedUrl = new URL(context.url);
		normalizedUrl.pathname = normalizedUrl.pathname.replace(TRAILING_SLASH_PATTERN, "");
		return context.redirect(normalizedUrl.toString(), 308);
	}

	return next();
});
