import { describe, expect, it } from "vitest";

import { applyBaselineSecurityHeaders } from "../../../src/astro/response-headers.js";

describe("applyBaselineSecurityHeaders", () => {
	it("adds baseline headers to a normal response", () => {
		const response = new Response("ok");

		const updated = applyBaselineSecurityHeaders(response);

		expect(updated).toBe(response);
		expect(updated.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(updated.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
		expect(updated.headers.get("Permissions-Policy")).toBe(
			"camera=(), microphone=(), geolocation=(), payment=()",
		);
		expect(updated.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
	});

	it("clones redirect responses with immutable headers and preserves the redirect", () => {
		const redirect = Response.redirect("https://example.com/submit-game", 303);

		const updated = applyBaselineSecurityHeaders(redirect);

		expect(updated).not.toBe(redirect);
		expect(updated.status).toBe(303);
		expect(updated.headers.get("Location")).toBe("https://example.com/submit-game");
		expect(updated.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(updated.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
		expect(updated.headers.get("Permissions-Policy")).toBe(
			"camera=(), microphone=(), geolocation=(), payment=()",
		);
		expect(updated.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
	});
});
