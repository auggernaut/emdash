import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { hasUserDefinedPublicRoute } from "../../../src/astro/integration/routes.js";

const tempDirs: string[] = [];

describe("hasUserDefinedPublicRoute", () => {
	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("returns false when no matching page file exists", () => {
		const dir = mkdtempSync(join(tmpdir(), "emdash-routes-"));
		tempDirs.push(dir);
		mkdirSync(join(dir, "pages"), { recursive: true });

		expect(hasUserDefinedPublicRoute(pathToFileURL(dir + "/"), "sitemap.xml")).toBe(false);
	});

	it("returns true when a matching page file exists", () => {
		const dir = mkdtempSync(join(tmpdir(), "emdash-routes-"));
		tempDirs.push(dir);
		mkdirSync(join(dir, "pages"), { recursive: true });
		writeFileSync(join(dir, "pages", "sitemap.xml.ts"), "export const GET = () => new Response();");

		expect(hasUserDefinedPublicRoute(pathToFileURL(dir + "/"), "sitemap.xml")).toBe(true);
	});
});
