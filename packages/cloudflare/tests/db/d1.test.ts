import { describe, expect, it, vi } from "vitest";

const D1_ADAPTER_MARKER = Symbol.for("emdash:d1-adapter");

vi.mock("cloudflare:workers", () => ({
	env: {
		DB: {
			prepare: vi.fn(),
		},
	},
}));

import { createDialect } from "../../src/db/d1.js";

describe("createDialect", () => {
	it("marks the D1 adapter so transaction probing can be skipped", () => {
		const dialect = createDialect({ binding: "DB" });
		const adapter = dialect.createAdapter() as Record<PropertyKey, unknown>;

		expect(adapter.constructor.name).toBe("SqliteAdapter");
		expect(adapter[D1_ADAPTER_MARKER]).toBe(true);
	});
});
