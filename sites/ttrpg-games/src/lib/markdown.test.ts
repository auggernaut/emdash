import { describe, expect, it } from "vitest";

import {
	buildMarkdownAlternateLink,
	createMarkdownResponse,
	htmlToMarkdown,
	markdownAlternatePathForPathname,
	prefersMarkdown,
} from "./markdown.js";

describe("markdown helpers", () => {
	it("maps public HTML paths to markdown alternates", () => {
		expect(markdownAlternatePathForPathname("/")).toBe("/index.md");
		expect(markdownAlternatePathForPathname("/categories")).toBe("/categories.md");
		expect(markdownAlternatePathForPathname("/item/pathfinder")).toBe("/item/pathfinder.md");
		expect(markdownAlternatePathForPathname("/blog/example/")).toBe("/blog/example.md");
		expect(markdownAlternatePathForPathname("/_emdash/admin")).toBeNull();
		expect(markdownAlternatePathForPathname("/index.md")).toBeNull();
	});

	it("builds link header values for markdown alternates", () => {
		expect(buildMarkdownAlternateLink("/item/pathfinder")).toBe(
			'</item/pathfinder.md>; rel="alternate"; type="text/markdown"',
		);
	});

	it("marks markdown responses as noindex for search engines", () => {
		const response = createMarkdownResponse("# Example\n");

		expect(response.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
		expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
	});

	it("honors Accept quality values when negotiating markdown", () => {
		expect(prefersMarkdown("text/markdown")).toBe(true);
		expect(prefersMarkdown("*/*")).toBe(false);
		expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
		expect(prefersMarkdown("text/html;q=0.4, text/markdown;q=0.8")).toBe(true);
		expect(prefersMarkdown("text/*;q=0.9, text/html;q=0.4")).toBe(true);
		expect(prefersMarkdown("application/json")).toBe(false);
	});

	it("converts simple HTML content into readable markdown", () => {
		expect(htmlToMarkdown("<h2>Overview</h2><p>A &amp; B<br>line</p><ul><li>One</li></ul>")).toBe(
			"## Overview\n\nA & B\nline\n\n- One",
		);
	});
});
