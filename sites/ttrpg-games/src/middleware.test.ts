import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const middlewareSource = readFileSync(new URL("./middleware.ts", import.meta.url), "utf8");

describe("request middleware", () => {
	it("does not trigger SEObot sync on page traffic", () => {
		expect(middlewareSource).not.toContain("syncSeobotPostsIfDue");
		expect(middlewareSource).not.toContain("Failed to run scheduled SEObot sync");
	});
});
