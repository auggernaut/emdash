import { Role } from "@emdash-cms/auth";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleTaxonomyCreate, handleTermCreate } from "../../../src/api/handlers/taxonomies.js";
import type { EmDashHandlers } from "../../../src/astro/types.js";
import { createMcpServer } from "../../../src/mcp/server.js";
import { setupTestDatabase, teardownTestDatabase } from "../../utils/test-db.js";

class AuthInjectingTransport extends InMemoryTransport {
	constructor(private authInfo: Record<string, unknown>) {
		super();
	}

	override async send(
		message: Parameters<InMemoryTransport["send"]>[0],
		options?: Parameters<InMemoryTransport["send"]>[1],
	): Promise<void> {
		const existingExtra =
			options?.authInfo && typeof options.authInfo === "object" && "extra" in options.authInfo
				? (options.authInfo.extra as Record<string, unknown>)
				: {};
		return super.send(message, {
			...options,
			authInfo: {
				token: "",
				clientId: "test",
				scopes: [],
				...options?.authInfo,
				extra: {
					...this.authInfo,
					...existingExtra,
				},
			},
		});
	}
}

function createAuthenticatedPair(authInfo: Record<string, unknown>) {
	const clientTransport = new AuthInjectingTransport(authInfo);
	const serverTransport = new InMemoryTransport();
	(clientTransport as unknown as Record<string, unknown>)._otherTransport = serverTransport;
	(serverTransport as unknown as Record<string, unknown>)._otherTransport = clientTransport;
	return [clientTransport, serverTransport] as const;
}

describe("MCP taxonomy tools", () => {
	let client: Client;
	let cleanup: (() => Promise<void>) | undefined;
	let db: Awaited<ReturnType<typeof setupTestDatabase>>;

	beforeEach(async () => {
		db = await setupTestDatabase();

		const taxonomyCreate = await handleTaxonomyCreate(db, {
			name: "genre",
			label: "Genres",
		});
		if (!taxonomyCreate.success) {
			throw new Error(taxonomyCreate.error.message);
		}

		const termCreate = await handleTermCreate(db, "genre", {
			slug: "mystery",
			label: "Mystery",
		});
		if (!termCreate.success) {
			throw new Error(termCreate.error.message);
		}

		const handlers = { db } as EmDashHandlers;
		const server = createMcpServer();
		const [clientTransport, serverTransport] = createAuthenticatedPair({
			emdash: handlers,
			userId: "user_editor",
			userRole: Role.EDITOR,
			tokenScopes: ["content:read", "content:write"],
		});

		await server.connect(serverTransport);
		client = new Client({ name: "test-client", version: "1.0.0" });
		await client.connect(clientTransport);

		cleanup = async () => {
			await client.close();
			await server.close();
		};
	});

	afterEach(async () => {
		if (cleanup) await cleanup();
		await teardownTestDatabase(db);
	});

	it("lists terms from the canonical taxonomies table", async () => {
		const result = await client.callTool({
			name: "taxonomy_list_terms",
			arguments: { taxonomy: "genre" },
		});

		expect(result.isError).toBeFalsy();
		const text = (result.content as Array<{ text: string }>)[0]?.text ?? "";
		const parsed = JSON.parse(text) as {
			items: Array<{ slug: string; label: string }>;
			nextCursor?: string;
		};
		expect(parsed.items).toEqual([
			expect.objectContaining({
				slug: "mystery",
				label: "Mystery",
			}),
		]);
		expect(parsed.nextCursor).toBeUndefined();
	});

	it("creates terms in the canonical taxonomies table", async () => {
		const result = await client.callTool({
			name: "taxonomy_create_term",
			arguments: {
				taxonomy: "genre",
				slug: "horror",
				label: "Horror",
			},
		});

		expect(result.isError).toBeFalsy();
		const text = (result.content as Array<{ text: string }>)[0]?.text ?? "";
		const parsed = JSON.parse(text) as {
			term: { slug: string; label: string; name: string };
		};
		expect(parsed.term).toEqual(
			expect.objectContaining({
				name: "genre",
				slug: "horror",
				label: "Horror",
			}),
		);

		const rows = await db
			.selectFrom("taxonomies")
			.select(["name", "slug", "label"])
			.where("name", "=", "genre")
			.where("slug", "=", "horror")
			.execute();

		expect(rows).toEqual([
			expect.objectContaining({
				name: "genre",
				slug: "horror",
				label: "Horror",
			}),
		]);
	});
});
