import type { MediaValue } from "emdash";

const MEDIA_FILE_PREFIX = "/_emdash/api/media/file/";
const DEV_STORAGE_PREFIX = "ttrpg-games-media/";

type MediaLike = MediaValue & {
	meta?: {
		storageKey?: string;
	};
};

function isMediaLike(value: unknown): value is MediaLike {
	return typeof value === "object" && value !== null;
}

function normalizeMediaPath(value: string): string {
	if (value.startsWith(DEV_STORAGE_PREFIX)) {
		return `${MEDIA_FILE_PREFIX}${value}`;
	}

	return value;
}

export function normalizeMediaValue(image: string): string;
export function normalizeMediaValue(image: MediaLike): MediaLike;
export function normalizeMediaValue(image: null): null;
export function normalizeMediaValue(image: undefined): undefined;
export function normalizeMediaValue(
	image: string | MediaLike | null | undefined,
): string | MediaLike | null | undefined;
export function normalizeMediaValue(
	image: string | MediaLike | null | undefined,
): string | MediaLike | null | undefined {
	if (!image) {
		return image;
	}

	if (typeof image === "string") {
		return normalizeMediaPath(image);
	}

	const media = image;
	const normalizedSrc = typeof media.src === "string" ? normalizeMediaPath(media.src) : media.src;
	const normalizedStorageKey =
		typeof media.meta?.storageKey === "string" ? media.meta.storageKey : media.meta?.storageKey;

	if (normalizedSrc === media.src && normalizedStorageKey === media.meta?.storageKey) {
		return image;
	}

	const meta =
		media.meta || normalizedStorageKey
			? {
					...media.meta,
					...(normalizedStorageKey ? { storageKey: normalizedStorageKey } : {}),
				}
			: undefined;

	return {
		...media,
		...(normalizedSrc ? { src: normalizedSrc } : {}),
		...(meta ? { meta } : {}),
	};
}

export function getMediaUrl(image: unknown, origin?: string): string | null {
	if (!(typeof image === "string" || image == null || isMediaLike(image))) {
		return null;
	}
	const normalized = normalizeMediaValue(image);
	if (!normalized) return null;

	if (typeof normalized === "string") {
		if (normalized.startsWith("/")) {
			return origin ? `${origin}${normalized}` : normalized;
		}
		return normalized;
	}

	if (normalized.src) {
		if (origin && normalized.src.startsWith("/")) {
			return `${origin}${normalized.src}`;
		}
		return normalized.src;
	}

	if (normalized.meta?.storageKey) {
		const url = `${MEDIA_FILE_PREFIX}${normalized.meta.storageKey}`;
		return origin ? `${origin}${url}` : url;
	}

	if (normalized.id) {
		const url = `${MEDIA_FILE_PREFIX}${normalized.id}`;
		return origin ? `${origin}${url}` : url;
	}

	return null;
}
