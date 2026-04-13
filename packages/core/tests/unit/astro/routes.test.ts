import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
	hasUserDefinedPublicRoute,
	injectCoreRoutes,
} from "../../../src/astro/integration/routes.js";
import { GET as getMediaFile } from "../../../src/astro/routes/api/media/file/[...key].js";

const tempDirs: string[] = [];

function mockMediaContext(key: string | undefined) {
	const download = vi.fn().mockResolvedValue({
		body: new Uint8Array([1, 2, 3]),
		contentType: "image/png",
		size: 3,
	});

	return {
		context: {
			params: { key },
			locals: {
				emdash: {
					storage: { download },
				},
			},
		} as Parameters<typeof getMediaFile>[0],
		download,
	};
}

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

describe("core media route injection", () => {
	it("uses a catch-all media file route so storage keys can contain slashes", () => {
		const routes: Array<{ pattern: string; entrypoint: string }> = [];
		injectCoreRoutes((route) => {
			routes.push({
				...route,
				entrypoint: route.entrypoint.replaceAll("\\", "/"),
			});
		});

		expect(routes).toContainEqual(
			expect.objectContaining({
				pattern: "/_emdash/api/media/file/[...key]",
				entrypoint: expect.stringContaining("api/media/file/[...key].ts"),
			}),
		);
	});
});

describe("media file catch-all route", () => {
	it("passes slash-containing keys through to storage.download", async () => {
		const { context, download } = mockMediaContext("nested/path/file.png");

		const response = await getMediaFile(context);
		expect(response.status).toBe(200);
		expect(download).toHaveBeenCalledWith("nested/path/file.png");
	});

	it("returns not found when the catch-all key is missing", async () => {
		const { context, download } = mockMediaContext(undefined);

		const response = await getMediaFile(context);
		expect(response.status).toBe(404);
		expect(download).not.toHaveBeenCalled();
	});
});
