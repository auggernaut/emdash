import { describe, expect, it, vi } from "vitest";

vi.mock("@emdash-cms/admin", () => ({
	AdminApp: "admin-app",
}));

vi.mock(
	"virtual:emdash/admin-registry",
	() => ({
		pluginAdmins: [{ id: "emdash-resend" }],
	}),
	{ virtual: true },
);

vi.mock(
	"virtual:emdash/auth-providers",
	() => ({
		authProviders: [{ id: "github" }],
	}),
	{ virtual: true },
);

import AdminWrapper from "../../../src/astro/routes/PluginRegistry.js";

describe("AdminWrapper", () => {
	it("creates an AdminApp element with plugin admins and locale props", () => {
		const element = AdminWrapper({
			locale: "en",
			messages: {},
		});

		expect(element).toMatchObject({
			type: "admin-app",
			props: {
				pluginAdmins: [{ id: "emdash-resend" }],
				authProviders: [{ id: "github" }],
				locale: "en",
				messages: {},
			},
		});
	});
});
