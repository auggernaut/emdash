/**
 * Baseline security headers applied to all responses.
 * Admin routes get additional headers (strict CSP) from auth middleware.
 */
export function applyBaselineSecurityHeaders(response: Response): Response {
	const mutableResponse = ensureMutableHeaders(response);

	// Prevent MIME type sniffing
	mutableResponse.headers.set("X-Content-Type-Options", "nosniff");
	// Control referrer information
	mutableResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	// Restrict access to sensitive browser APIs
	mutableResponse.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=(), payment=()",
	);
	// Prevent clickjacking (non-admin routes; admin CSP uses frame-ancestors)
	if (!mutableResponse.headers.has("Content-Security-Policy")) {
		mutableResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
	}

	return mutableResponse;
}

function ensureMutableHeaders(response: Response): Response {
	try {
		response.headers.set("X-EmDash-Mutability-Probe", "1");
		response.headers.delete("X-EmDash-Mutability-Probe");
		return response;
	} catch (error) {
		if (!(error instanceof TypeError) || !error.message.includes("immutable")) {
			throw error;
		}

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(response.headers),
		});
	}
}
