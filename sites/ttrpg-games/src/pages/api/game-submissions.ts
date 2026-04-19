import * as path from "node:path";

import type { APIRoute } from "astro";

export const prerender = false;

const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/avif",
	"image/gif",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class SubmissionError extends Error {
	constructor(public code: string) {
		super(code);
		this.name = "SubmissionError";
	}
}

function redirectToSubmissionPage(request: Request, search: URLSearchParams) {
	const redirectUrl = new URL("/submit-game", request.url);
	redirectUrl.search = search.toString();
	return Response.redirect(redirectUrl, 303);
}

function getTrimmedString(formData: FormData, key: string): string {
	const value = formData.get(key);
	return typeof value === "string" ? value.trim() : "";
}

function requireNonEmpty(value: string, code: string): string {
	if (!value) {
		throw new SubmissionError(code);
	}
	return value;
}

function normalizeWebsiteUrl(value: string): string | null {
	if (!value) return null;
	try {
		const parsed = new URL(value);
		if (!["http:", "https:"].includes(parsed.protocol)) {
			throw new SubmissionError("invalid_website_url");
		}
		return parsed.toString();
	} catch {
		throw new SubmissionError("invalid_website_url");
	}
}

function normalizeImagePath(value: string): string | null {
	if (!value) return null;
	if (value.startsWith("/") && !value.startsWith("//")) {
		return value;
	}
	try {
		const parsed = new URL(value);
		if (!["http:", "https:"].includes(parsed.protocol)) {
			throw new SubmissionError("invalid_image_path");
		}
		return parsed.toString();
	} catch {
		throw new SubmissionError("invalid_image_path");
	}
}

function normalizeEmail(value: string): string {
	const trimmed = value.trim();
	if (!EMAIL_PATTERN.test(trimmed)) {
		throw new SubmissionError("invalid_email");
	}
	return trimmed.toLowerCase();
}

function assertSameOrigin(request: Request) {
	const origin = request.headers.get("origin");
	if (!origin) return;

	try {
		if (new URL(origin).origin !== new URL(request.url).origin) {
			throw new SubmissionError("forbidden");
		}
	} catch (error) {
		if (error instanceof SubmissionError) throw error;
		throw new SubmissionError("forbidden");
	}
}

export const POST: APIRoute = async ({ request, locals, cache }) => {
	try {
		assertSameOrigin(request);

		const { emdash } = locals;
		if (!emdash?.handleContentCreate) {
			throw new SubmissionError("not_configured");
		}

		const formData = await request.formData();

		// Silently accept likely bot traffic from the honeypot field.
		if (getTrimmedString(formData, "company")) {
			return redirectToSubmissionPage(request, new URLSearchParams({ submitted: "1" }));
		}

		const title = requireNonEmpty(getTrimmedString(formData, "title"), "missing_required");
		const websiteUrl = normalizeWebsiteUrl(getTrimmedString(formData, "websiteUrl"));
		const description = requireNonEmpty(
			getTrimmedString(formData, "description"),
			"missing_required",
		);
		const publisherOrCreator = getTrimmedString(formData, "publisherOrCreator");
		const submitterName = requireNonEmpty(
			getTrimmedString(formData, "submitterName"),
			"missing_required",
		);
		const submitterEmail = normalizeEmail(getTrimmedString(formData, "submitterEmail"));
		const submissionNotes = getTrimmedString(formData, "submissionNotes");
		const imagePath = normalizeImagePath(getTrimmedString(formData, "imagePath"));
		const imageFileEntry = formData.get("imageFile");
		const imageFile =
			imageFileEntry instanceof File && imageFileEntry.size > 0 ? imageFileEntry : null;

		if (imagePath && imageFile) {
			throw new SubmissionError("both_image_inputs");
		}

		let uploadedStorageKey: string | null = null;
		let uploadedMediaId: string | null = null;
		let imageUrl = imagePath;

		if (imageFile) {
			if (!emdash.storage || !emdash.handleMediaCreate) {
				throw new SubmissionError("storage_not_configured");
			}

			if (!ALLOWED_IMAGE_TYPES.has(imageFile.type)) {
				throw new SubmissionError("invalid_image_type");
			}

			if (imageFile.size > MAX_IMAGE_UPLOAD_SIZE) {
				throw new SubmissionError("image_too_large");
			}

			const ext = path.extname(imageFile.name).toLowerCase();
			uploadedStorageKey = `submission-${crypto.randomUUID()}${ext}`;
			const body = new Uint8Array(await imageFile.arrayBuffer());

			await emdash.storage.upload({
				key: uploadedStorageKey,
				body,
				contentType: imageFile.type,
			});

			const mediaResult = await emdash.handleMediaCreate({
				filename: imageFile.name,
				mimeType: imageFile.type,
				size: imageFile.size,
				storageKey: uploadedStorageKey,
			});

			if (!mediaResult.success) {
				await emdash.storage.delete(uploadedStorageKey);
				throw new SubmissionError("submission_failed");
			}

			const mediaItem = mediaResult.data?.item;
			if (
				mediaItem &&
				typeof mediaItem === "object" &&
				"id" in mediaItem &&
				typeof mediaItem.id === "string"
			) {
				uploadedMediaId = mediaItem.id;
			}

			imageUrl = `/_emdash/api/media/file/${uploadedStorageKey}`;
		}

		const moderationNotes = [
			"Visitor submission via /submit-game",
			`Submitter: ${submitterName} <${submitterEmail}>`,
			publisherOrCreator ? `Publisher or creator: ${publisherOrCreator}` : null,
			submissionNotes ? `Submission notes: ${submissionNotes}` : null,
		]
			.filter((value): value is string => Boolean(value))
			.join("\n");

		const data: Record<string, unknown> = {
			title,
			website_url: websiteUrl,
			image_url: imageUrl,
			publisher_or_creator: publisherOrCreator || null,
			blurb: description,
			review_summary: description,
			notes: moderationNotes,
			submitted_by_visitor: true,
			submitter_name: submitterName,
			submitter_email: submitterEmail,
			submission_notes: submissionNotes || null,
		};

		const fallbackData: Record<string, unknown> = {
			title,
			website_url: websiteUrl,
			image_url: imageUrl,
			blurb: description,
			review_summary: description,
			notes: moderationNotes,
		};

		let result = await emdash.handleContentCreate("games", {
			status: "draft",
			data,
		});

		if (!result.success) {
			result = await emdash.handleContentCreate("games", {
				status: "draft",
				data: fallbackData,
			});
		}

		if (!result.success) {
			if (uploadedMediaId && emdash.handleMediaDelete) {
				await emdash.handleMediaDelete(uploadedMediaId);
			}
			if (uploadedStorageKey && emdash.storage) {
				await emdash.storage.delete(uploadedStorageKey);
			}
			throw new SubmissionError("submission_failed");
		}

		if (cache.enabled) {
			try {
				await cache.invalidate({ tags: ["games"] });
			} catch (error) {
				console.warn("[CACHE_INVALIDATE_FAILED] game submission", error);
			}
		}

		return redirectToSubmissionPage(request, new URLSearchParams({ submitted: "1" }));
	} catch (error) {
		if (error instanceof SubmissionError) {
			return redirectToSubmissionPage(request, new URLSearchParams({ error: error.code }));
		}
		console.error("[GAME_SUBMISSION_ERROR]", error);
		return redirectToSubmissionPage(request, new URLSearchParams({ error: "submission_failed" }));
	}
};
