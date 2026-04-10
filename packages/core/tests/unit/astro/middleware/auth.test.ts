import { describe, expect, it } from "vitest";

import { isPublicEmDashRoute } from "../../../../src/astro/middleware/public-routes.js";

describe("isPublicEmDashRoute", () => {
	it("treats public site search endpoints as public", () => {
		expect(isPublicEmDashRoute("/_emdash/api/search")).toBe(true);
		expect(isPublicEmDashRoute("/_emdash/api/search/suggest")).toBe(true);
	});

	it("keeps search admin endpoints protected", () => {
		expect(isPublicEmDashRoute("/_emdash/api/search/rebuild")).toBe(false);
		expect(isPublicEmDashRoute("/_emdash/api/search/stats")).toBe(false);
		expect(isPublicEmDashRoute("/_emdash/api/search/enable")).toBe(false);
	});
});
