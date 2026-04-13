/**
 * Media list and upload endpoint
 *
 * GET /_emdash/api/media - List all media
 * POST /_emdash/api/media - Upload new media (via configured storage adapter)
 */

import type { APIRoute } from "astro";

import { requirePerm } from "#api/authorize.js";
import { apiError, apiSuccess, handleError, unwrapResult } from "#api/error.js";
import { isParseError, parseQuery } from "#api/parse.js";
import { mediaListQuery } from "#api/schemas.js";

import type { MediaItem } from "../../types.js";

export const prerender = false;

/** Maximum allowed file upload size (50 MB). */
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

/**
 * Add URL to media items
 * Uses relative URLs to ensure portability across deployments
 */
function addUrlToMedia(item: MediaItem): MediaItem & { url: string } {
	return {
		...item,
		url: `/_emdash/api/media/file/${item.storageKey}`,
	};
}

/**
 * List media items
 */
export const GET: APIRoute = async ({ request, locals }) => {
	const { emdash, user } = locals;

	const denied = requirePerm(user, "media:read");
	if (denied) return denied;

	if (!emdash?.handleMediaList) {
		return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	}

	const url = new URL(request.url);
	const query = parseQuery(url, mediaListQuery);
	if (isParseError(query)) return query;

	const result = await emdash.handleMediaList({
		cursor: query.cursor,
		limit: query.limit,
		mimeType: query.mimeType,
	});

	if (!result.success) {
		return unwrapResult(result);
	}

	// Add URL to each media item (relative URLs for portability)
	const itemsWithUrl = result.data.items.map((item) => addUrlToMedia(item));

	return apiSuccess({ items: itemsWithUrl, nextCursor: result.data.nextCursor });
};

/**
 * Upload media file
 *
 * Uses the configured storage adapter to store the file.
 */
export const POST: APIRoute = async ({ request, locals }) => {
	const { emdash, user } = locals;

	const denied = requirePerm(user, "media:upload");
	if (denied) return denied;

	if (!emdash?.handleMediaUpload) {
		return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	}

	if (!emdash?.storage) {
		return apiError("NO_STORAGE", "Storage not configured", 500);
	}

	try {
		// Best-effort size check before buffering the full multipart body
		const contentLength = request.headers.get("Content-Length");
		if (contentLength && parseInt(contentLength, 10) > MAX_UPLOAD_SIZE) {
			return apiError("PAYLOAD_TOO_LARGE", "Upload too large", 413);
		}

		const formData = await request.formData();
		const fileEntry = formData.get("file");
		const file = fileEntry instanceof File ? fileEntry : null;

		if (!file) {
			return apiError("NO_FILE", "No file provided", 400);
		}

		// Validate file type
		const allowedTypes = ["image/", "video/", "audio/", "application/pdf"];
		if (!allowedTypes.some((type) => file.type.startsWith(type))) {
			return apiError("INVALID_TYPE", "File type not allowed", 400);
		}

		// Check file size before buffering
		if (file.size > MAX_UPLOAD_SIZE) {
			return apiError(
				"PAYLOAD_TOO_LARGE",
				`File exceeds maximum size of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
				413,
			);
		}

		// Get file content
		const buffer = new Uint8Array(await file.arrayBuffer());

		// Get image dimensions from form data (sent by client)
		const widthEntry = formData.get("width");
		const widthStr = typeof widthEntry === "string" ? widthEntry : null;
		const heightEntry = formData.get("height");
		const heightStr = typeof heightEntry === "string" ? heightEntry : null;
		const width = widthStr ? parseInt(widthStr, 10) : undefined;
		const height = heightStr ? parseInt(heightStr, 10) : undefined;

		// Generate placeholder data for images.
		// If the client sent a thumbnail (small pre-resized image), use that
		// instead of the full buffer to avoid OOM on memory-constrained runtimes.
		const thumbnailEntry = formData.get("thumbnail");
		const thumbnail = thumbnailEntry instanceof File ? thumbnailEntry : null;
		const thumbnailBuffer = thumbnail ? new Uint8Array(await thumbnail.arrayBuffer()) : undefined;

		const result = await emdash.handleMediaUpload({
			filename: file.name,
			mimeType: file.type,
			body: buffer,
			size: file.size,
			width,
			height,
			thumbnailBody: thumbnailBuffer,
			thumbnailMimeType: thumbnail?.type,
			authorId: user?.id,
		});

		if (!result.success) return unwrapResult(result);

		// Add URL to the response (relative URL for portability)
		const itemWithUrl = addUrlToMedia(result.data.item);

		return apiSuccess({ item: itemWithUrl }, 201);
	} catch (error) {
		return handleError(error, "Upload failed", "UPLOAD_ERROR");
	}
};
