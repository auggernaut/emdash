import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const workerSource = readFileSync(new URL("./worker.ts", import.meta.url), "utf8");

describe("worker entrypoint", () => {
	it("registers a scheduled sync handler", () => {
		expect(workerSource).toContain("scheduled(");
		expect(workerSource).toContain("syncSeobotPostsIfDue");
	});
});
