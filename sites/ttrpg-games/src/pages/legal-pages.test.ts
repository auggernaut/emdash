import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("legal pages", () => {
	it("opt into the shared header offset shell used under the transparent nav", () => {
		const privacyPolicySource = readFileSync(
			new URL("./privacy-policy.astro", import.meta.url),
			"utf8",
		);
		const termsOfUseSource = readFileSync(new URL("./terms-of-use.astro", import.meta.url), "utf8");
		const baseLayoutSource = readFileSync(
			new URL("../layouts/Base.astro", import.meta.url),
			"utf8",
		);

		expect(privacyPolicySource).toContain('class="stack header-offset-shell"');
		expect(termsOfUseSource).toContain('class="stack header-offset-shell"');
		expect(baseLayoutSource).toContain(".header-offset-shell");
		expect(baseLayoutSource).toContain("padding-top: 132px;");
		expect(baseLayoutSource).toContain("@media (max-width: 960px)");
		expect(baseLayoutSource).toContain("position: sticky;");
		expect(baseLayoutSource).toContain("padding-top: 0;");
	});
});
