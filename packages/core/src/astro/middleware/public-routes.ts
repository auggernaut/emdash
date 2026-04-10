/**
 * API routes that skip auth — each handles its own access control.
 *
 * Prefix entries match any path starting with that prefix.
 * Exact entries (no trailing slash or wildcard) match that path only.
 */
const PUBLIC_API_PREFIXES = [
	"/_emdash/api/setup",
	"/_emdash/api/auth/login",
	"/_emdash/api/auth/register",
	"/_emdash/api/auth/dev-bypass",
	"/_emdash/api/auth/signup/",
	"/_emdash/api/auth/magic-link/",
	"/_emdash/api/auth/invite/accept",
	"/_emdash/api/auth/invite/complete",
	"/_emdash/api/auth/oauth/",
	"/_emdash/api/oauth/device/token",
	"/_emdash/api/oauth/device/code",
	"/_emdash/api/oauth/token",
	"/_emdash/api/comments/",
	"/_emdash/api/media/file/",
	"/_emdash/.well-known/",
] as const;

const PUBLIC_API_EXACT = new Set([
	"/_emdash/api/auth/passkey/options",
	"/_emdash/api/auth/passkey/verify",
	"/_emdash/api/oauth/token",
	"/_emdash/api/search",
	"/_emdash/api/search/suggest",
	"/_emdash/api/snapshot",
]);

export function isPublicEmDashRoute(pathname: string, isDev = false): boolean {
	if (PUBLIC_API_EXACT.has(pathname)) return true;
	if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
	if (isDev && pathname === "/_emdash/api/typegen") return true;
	return false;
}
