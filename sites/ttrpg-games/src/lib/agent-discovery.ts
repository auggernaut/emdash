const DISCOVERY_LINKS = [
	'</sitemap.xml>; rel="sitemap"; type="application/xml"',
	'</llms.txt>; rel="alternate"; type="text/plain"',
	'</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
];

export function buildAgentDiscoveryLinkHeader(): string {
	return DISCOVERY_LINKS.join(", ");
}

export function shouldAttachAgentDiscoveryLinkHeader(
	method: string,
	contentType: string | null,
): boolean {
	return (
		(method === "GET" || method === "HEAD") &&
		typeof contentType === "string" &&
		contentType.toLowerCase().includes("text/html")
	);
}
