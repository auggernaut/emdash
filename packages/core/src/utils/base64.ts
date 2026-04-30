/**
 * Base64 encoding/decoding utilities.
 *
 * Uses native Uint8Array.prototype.toBase64 / Uint8Array.fromBase64 when
 * available (workerd, Node 26+, modern browsers), falls back to btoa/atob.
 *
 * All base64url encoding uses the { alphabet: "base64url" } option natively
 * or manual character replacement as fallback.
 *
 * Delete the fallback paths when the minimum Node version supports these
 * methods natively.
 */

interface Uint8ArrayBase64Options {
	alphabet?: "base64" | "base64url";
	omitPadding?: boolean;
}

type NativeToBase64 = (options?: Uint8ArrayBase64Options) => string;
type NativeFromBase64 = (encoded: string, options?: Uint8ArrayBase64Options) => Uint8Array;

function getNativeToBase64(value: Uint8Array): NativeToBase64 | undefined {
	const toBase64 = Reflect.get(value, "toBase64");
	if (typeof toBase64 !== "function") return undefined;
	return (options) => {
		const result: unknown = toBase64.call(value, options);
		if (typeof result !== "string") {
			throw new TypeError("Uint8Array.prototype.toBase64 returned a non-string value");
		}
		return result;
	};
}

function getNativeFromBase64(): NativeFromBase64 | undefined {
	const fromBase64 = Reflect.get(Uint8Array, "fromBase64");
	if (typeof fromBase64 !== "function") return undefined;
	return (encoded, options) => {
		const result: unknown = fromBase64.call(Uint8Array, encoded, options);
		if (!(result instanceof Uint8Array)) {
			throw new TypeError("Uint8Array.fromBase64 returned a non-Uint8Array value");
		}
		return result;
	};
}

// Regex patterns for base64url character replacement
const BASE64_PLUS_PATTERN = /\+/g;
const BASE64_SLASH_PATTERN = /\//g;
const BASE64_PADDING_PATTERN = /=+$/;
const BASE64URL_DASH_PATTERN = /-/g;
const BASE64URL_UNDERSCORE_PATTERN = /_/g;

// ---------------------------------------------------------------------------
// Standard base64 (for opaque tokens, cursors, Basic Auth, etc.)
// ---------------------------------------------------------------------------

/** Encode a UTF-8 string as standard base64. */
export function encodeBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	const toBase64 = getNativeToBase64(bytes);
	if (toBase64) return toBase64();
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

/** Decode a standard base64 string to a UTF-8 string. */
export function decodeBase64(base64: string): string {
	return new TextDecoder().decode(decodeBase64ToBytes(base64));
}

/** Decode a standard base64 string to raw bytes. */
export function decodeBase64ToBytes(base64: string): Uint8Array {
	const fromBase64 = getNativeFromBase64();
	if (fromBase64) return fromBase64(base64);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

// ---------------------------------------------------------------------------
// Base64url (for tokens, HMAC signatures, PKCE, etc.)
// ---------------------------------------------------------------------------

/** Encode bytes as base64url without padding. */
export function encodeBase64url(bytes: Uint8Array): string {
	const toBase64 = getNativeToBase64(bytes);
	if (toBase64) {
		return toBase64({
			alphabet: "base64url",
			omitPadding: true,
		});
	}
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary)
		.replace(BASE64_PLUS_PATTERN, "-")
		.replace(BASE64_SLASH_PATTERN, "_")
		.replace(BASE64_PADDING_PATTERN, "");
}

/** Decode a base64url string (with or without padding) to bytes. */
export function decodeBase64url(encoded: string): Uint8Array {
	const fromBase64 = getNativeFromBase64();
	if (fromBase64) return fromBase64(encoded, { alphabet: "base64url" });
	const base64 = encoded
		.replace(BASE64URL_DASH_PATTERN, "+")
		.replace(BASE64URL_UNDERSCORE_PATTERN, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
