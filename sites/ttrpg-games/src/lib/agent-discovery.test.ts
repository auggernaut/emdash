import { describe, expect, it } from "vitest";

import {
	buildAgentDiscoveryLinkHeader,
	shouldAttachAgentDiscoveryLinkHeader,
} from "./agent-discovery.js";

describe("agent discovery headers", () => {
	it("advertises public discovery surfaces without exposing the private MCP endpoint", () => {
		const header = buildAgentDiscoveryLinkHeader();

		expect(header).toContain("</sitemap.xml>");
		expect(header).toContain("</llms.txt>");
		expect(header).toContain("</.well-known/api-catalog>");
		expect(header).not.toContain("/_emdash/api/mcp");
		expect(header).not.toContain("mcp-server-card");
	});

	it("only attaches discovery headers to GET and HEAD HTML responses", () => {
		expect(shouldAttachAgentDiscoveryLinkHeader("GET", "text/html; charset=utf-8")).toBe(true);
		expect(shouldAttachAgentDiscoveryLinkHeader("HEAD", "text/html")).toBe(true);
		expect(shouldAttachAgentDiscoveryLinkHeader("POST", "text/html")).toBe(false);
		expect(shouldAttachAgentDiscoveryLinkHeader("GET", "application/json")).toBe(false);
		expect(shouldAttachAgentDiscoveryLinkHeader("GET", null)).toBe(false);
	});
});
