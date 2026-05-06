import { defineMiddleware } from "astro:middleware";

import {
	buildAgentDiscoveryLinkHeader,
	shouldAttachAgentDiscoveryLinkHeader,
} from "./lib/agent-discovery.js";
import {
	appendVary,
	buildMarkdownAlternateLink,
	markdownAlternatePathForPathname,
	prefersMarkdown,
} from "./lib/markdown.js";

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

	const markdownAlternatePath = markdownAlternatePathForPathname(context.url.pathname);
	if (
		markdownAlternatePath &&
		(context.request.method === "GET" || context.request.method === "HEAD") &&
		prefersMarkdown(context.request.headers.get("Accept"))
	) {
		const response = await context.rewrite(`${markdownAlternatePath}${context.url.search}`);
		appendVary(response.headers, "Accept");
		return response;
	}

	const response = await next();

	if (
		shouldAttachAgentDiscoveryLinkHeader(
			context.request.method,
			response.headers.get("Content-Type"),
		)
	) {
		response.headers.append("Link", buildAgentDiscoveryLinkHeader());
	}

	const markdownLink = buildMarkdownAlternateLink(context.url.pathname);
	if (
		markdownLink &&
		shouldAttachAgentDiscoveryLinkHeader(
			context.request.method,
			response.headers.get("Content-Type"),
		)
	) {
		response.headers.append("Link", markdownLink);
		appendVary(response.headers, "Accept");
	}

	return response;
});
