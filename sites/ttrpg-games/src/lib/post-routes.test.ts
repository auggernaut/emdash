import { describe, expect, it } from "vitest";

import { getPostIndexPath, getPostPath, isToolPost } from "./post-routes";
import { getSeobotPostMetadata } from "./seobot-post-metadata";

describe("post tool routing", () => {
	it("routes future tool posts from stored metadata instead of a slug allowlist", () => {
		const post = {
			id: "future-tool-slug",
			data: {
				is_tool: true,
			},
		};

		expect(isToolPost(post)).toBe(true);
		expect(getPostPath(post)).toBe("/tools/future-tool-slug");
		expect(getPostIndexPath(post)).toBe("/tools");
	});

	it("keeps ordinary editorial posts under /blog", () => {
		const post = {
			id: "ordinary-editorial-post",
			data: {
				is_tool: false,
			},
		};

		expect(isToolPost(post)).toBe(false);
		expect(getPostPath(post)).toBe("/blog/ordinary-editorial-post");
		expect(getPostIndexPath(post)).toBe("/blog");
	});

	it("treats numeric tool flags from the database as tool posts", () => {
		const post = {
			id: "stored-tool-slug",
			data: {
				is_tool: 1,
			},
		};

		expect(isToolPost(post)).toBe(true);
		expect(getPostPath(post)).toBe("/tools/stored-tool-slug");
		expect(getPostIndexPath(post)).toBe("/tools");
	});
});

describe("SEObot tool metadata", () => {
	it("extracts tool metadata from SEObot article fields", () => {
		expect(
			getSeobotPostMetadata({
				isTool: true,
				toolId: "tool_123",
			}),
		).toEqual({
			is_tool: true,
			tool_id: "tool_123",
		});
	});

	it("clears tool metadata for normal blog posts", () => {
		expect(
			getSeobotPostMetadata({
				isTool: false,
				toolId: "tool_123",
			}),
		).toEqual({
			is_tool: false,
			tool_id: null,
		});
	});
});
