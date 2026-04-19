import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("base layout", () => {
	it("uses a dedicated mobile navigation drawer instead of keeping inline nav and search visible", () => {
		const layoutSource = readFileSync(new URL("./Base.astro", import.meta.url), "utf8");

		expect(layoutSource).toContain('class="brand-logo-picture"');
		expect(layoutSource).toContain('type="image/avif"');
		expect(layoutSource).toContain('type="image/webp"');
		expect(layoutSource).toContain('class="mobile-nav-toggle"');
		expect(layoutSource).toContain('class="mobile-nav-panel"');
		expect(layoutSource).not.toContain('class="mobile-nav-heading"');
		expect(layoutSource).toContain("@media (max-width: 960px)");
		expect(layoutSource).toContain("position: sticky;");
		expect(layoutSource).toContain(".nav-links,");
		expect(layoutSource).toContain(".nav-search {");
		expect(layoutSource).toContain("display: none;");
		expect(layoutSource).toContain(".brand-copy {");
	});

	it("keeps mobile page content tight under the sticky header", () => {
		const layoutSource = readFileSync(new URL("./Base.astro", import.meta.url), "utf8");

		expect(layoutSource).toContain(".page-shell {");
		expect(layoutSource).toContain("padding-top: 0;");
		expect(layoutSource).toContain(".page-shell > .stack:first-child {");
		expect(layoutSource).toContain("padding-top: var(--stack-gap, 28px);");
	});
});
