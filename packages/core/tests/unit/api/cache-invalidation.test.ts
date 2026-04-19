import { describe, expect, it, vi } from "vitest";

import { invalidateCacheTags } from "../../../src/api/cache.js";

describe("invalidateCacheTags", () => {
	it("skips invalidation when caching is disabled", async () => {
		const invalidate = vi.fn();

		await invalidateCacheTags(
			{
				enabled: false,
				invalidate,
			},
			["posts"],
			"content publish",
		);

		expect(invalidate).not.toHaveBeenCalled();
	});

	it("forwards tags to Astro cache invalidation when enabled", async () => {
		const invalidate = vi.fn().mockResolvedValue(undefined);

		await invalidateCacheTags(
			{
				enabled: true,
				invalidate,
			},
			["posts", "post_123"],
			"content publish",
		);

		expect(invalidate).toHaveBeenCalledWith({ tags: ["posts", "post_123"] });
	});

	it("logs and continues when invalidation fails", async () => {
		const invalidate = vi.fn().mockRejectedValue(new Error("missing purge credentials"));
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		await expect(
			invalidateCacheTags(
				{
					enabled: true,
					invalidate,
				},
				["posts"],
				"content publish",
			),
		).resolves.toBeUndefined();

		expect(warn).toHaveBeenCalledWith(
			"[CACHE_INVALIDATE_FAILED] content publish",
			expect.any(Error),
		);

		warn.mockRestore();
	});
});
