import { defineMiddleware } from "astro:middleware";

import { syncSeobotPostsIfDue } from "./lib/seobot-sync";

const TRAILING_SLASH_PATTERN = /\/+$/;

type EmDashLocals = {
	db: Parameters<typeof syncSeobotPostsIfDue>[0]["db"];
	storage: Parameters<typeof syncSeobotPostsIfDue>[0]["storage"];
	handleContentCreate: Parameters<typeof syncSeobotPostsIfDue>[0]["handleContentCreate"];
	handleContentGet: Parameters<typeof syncSeobotPostsIfDue>[0]["handleContentGet"];
};

type WaitUntilLocals = {
	runtime?: {
		waitUntil?: (promise: Promise<unknown>) => void;
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isEmDashLocals(value: unknown): value is EmDashLocals {
	if (!isRecord(value)) return false;

	return (
		"db" in value &&
		"storage" in value &&
		"handleContentCreate" in value &&
		"handleContentGet" in value
	);
}

function hasWaitUntilRuntime(value: unknown): value is WaitUntilLocals {
	if (!isRecord(value) || !("runtime" in value)) return false;
	const runtime = value.runtime;
	if (!isRecord(runtime)) return false;

	return !("waitUntil" in runtime) || typeof runtime.waitUntil === "function";
}

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

	const response = await next();

	if (context.url.pathname === "/api/seobot/sync") {
		return response;
	}

	const emdash = isRecord(context.locals) ? context.locals.emdash : undefined;
	if (!isEmDashLocals(emdash)) {
		return response;
	}

	const task = syncSeobotPostsIfDue({
		db: emdash.db,
		storage: emdash.storage,
		handleContentCreate: emdash.handleContentCreate,
		handleContentGet: emdash.handleContentGet,
	}).catch((error) => {
		console.error("Failed to run scheduled SEObot sync", error);
	});

	const runtime = hasWaitUntilRuntime(context.locals) ? context.locals.runtime : undefined;
	if (runtime?.waitUntil) {
		runtime.waitUntil(task);
	} else {
		void task;
	}

	return response;
});
