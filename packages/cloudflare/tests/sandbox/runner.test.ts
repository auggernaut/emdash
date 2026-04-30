import type { PluginManifest } from "emdash";
import type { Kysely } from "kysely";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loaderGet, pluginBridgeFactory } = vi.hoisted(() => ({
	loaderGet: vi.fn(),
	pluginBridgeFactory: vi.fn(() => ({}) as object),
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		LOADER: {
			get: loaderGet,
		},
	},
	exports: {
		PluginBridge: pluginBridgeFactory,
	},
	WorkerEntrypoint: class WorkerEntrypoint {
		env: unknown;

		constructor(env?: unknown) {
			this.env = env;
		}
	},
}));

import { CloudflareSandboxRunner } from "../../src/sandbox/runner.js";

const TEST_DB = {} as Kysely<any>;

const TEST_MANIFEST: PluginManifest = {
	id: "test-plugin",
	version: "1.0.0",
	capabilities: [],
	allowedHosts: [],
	storage: {},
	hooks: [],
	routes: [],
	admin: {},
};

describe("CloudflareSandboxRunner", () => {
	beforeEach(() => {
		loaderGet.mockReset();
		pluginBridgeFactory.mockClear();
	});

	it("provides an emdash shim module to the Worker Loader", async () => {
		let capturedConfig: Record<string, unknown> | undefined;

		loaderGet.mockImplementation((_id, factory: () => Record<string, unknown>) => {
			capturedConfig = factory();
			return {
				getEntrypoint() {
					return {
						invokeHook: vi.fn().mockResolvedValue(undefined),
						invokeRoute: vi.fn().mockResolvedValue(undefined),
					};
				},
			};
		});

		const runner = new CloudflareSandboxRunner({ db: TEST_DB });
		const plugin = await runner.load(
			TEST_MANIFEST,
			'import { definePlugin } from "emdash"; export default definePlugin({ hooks: {} });',
		);

		await plugin.invokeHook("init", {});

		expect(loaderGet).toHaveBeenCalledTimes(1);
		expect(capturedConfig).toBeDefined();
		expect(capturedConfig?.compatibilityDate).toBe("2026-04-01");
		expect(capturedConfig?.modules).toMatchObject({
			emdash: { js: "export const definePlugin = (d) => d;\n" },
		});
	});
});
