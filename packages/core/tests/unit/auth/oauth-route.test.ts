import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAuthorizationUrl, createOAuthStateStore } = vi.hoisted(() => ({
	createAuthorizationUrl: vi.fn(),
	createOAuthStateStore: vi.fn(),
}));

vi.mock("@emdash-cms/auth", () => ({
	createAuthorizationUrl,
}));

vi.mock("#auth/oauth-state-store.js", () => ({
	createOAuthStateStore,
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		GITHUB_CLIENT_ID: "github-client-id",
		GITHUB_CLIENT_SECRET: "github-client-secret",
	},
}));

import { GET as startOAuth } from "../../../src/astro/routes/api/auth/oauth/[provider].js";

describe("oauth provider route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createOAuthStateStore.mockReturnValue({});
		createAuthorizationUrl.mockResolvedValue({
			url: "https://github.com/login/oauth/authorize?client_id=github-client-id",
			state: "state-123",
		});
	});

	it("uses the Cloudflare worker env when starting the OAuth flow", async () => {
		const redirect = vi.fn((location: string) => new Response(null, { status: 302, headers: { Location: location } }));

		const context = {
			params: { provider: "github" },
			request: new Request("https://ttrpg-games.augman.workers.dev/_emdash/api/auth/oauth/github"),
			locals: {
				emdash: {
					db: {},
					config: {},
				},
				runtime: new Proxy(
					{},
					{
						get() {
							throw new Error("locals.runtime.env should not be accessed");
						},
					},
				),
			},
			redirect,
		};

		const response = await startOAuth(context as unknown as Parameters<typeof startOAuth>[0]);

		expect(createOAuthStateStore).toHaveBeenCalled();
		expect(createAuthorizationUrl).toHaveBeenCalledWith(
			{
				baseUrl: "https://ttrpg-games.augman.workers.dev/_emdash",
				providers: {
					github: {
						clientId: "github-client-id",
						clientSecret: "github-client-secret",
					},
				},
			},
			"github",
			{},
		);
		expect(redirect).toHaveBeenCalledWith(
			"https://github.com/login/oauth/authorize?client_id=github-client-id",
		);
		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe(
			"https://github.com/login/oauth/authorize?client_id=github-client-id",
		);
	});
});
