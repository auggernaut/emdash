# Core App Changes By Auggernaut / This Line Of Work

This file is intentionally scoped.

It summarizes only non-merge `packages/core` commits in https://github.com/auggernaut/emdash. It does **not** summarize unrelated upstream work.

Included commits:

- `f512382` — 2026-04-13 — `feat: implement media upload handler with deduplication and add content term management API methods`
- `4bacbe6` — 2026-04-12 — `refactor: migrate TTRPG data from CSV to modular scripts, update Astro configuration, and implement sitemap generation and trailing slash redirects.`
- `2a4dba2` — 2026-04-10 — `refactor: update admin UI styles, improve middleware routing, and add dev utility scripts`
- `a77a0b1` — 2026-04-06 — `fix: add baseline security headers`
- `0f9094e` — 2026-04-04 — `feat: initialize ttrpg-games demo project with documentation and site scaffolding`

## Short Version

If you want the shortest team-facing version:

> Auggernaut’s core-app work on this branch has mainly been about improving media upload and taxonomy assignment flows, expanding MCP support for those workflows, fixing MCP ownership edge cases, making route injection safer for user-defined public routes, splitting public-route detection out of auth middleware, making search endpoints intentionally public while keeping admin search endpoints private, hardening baseline security headers for immutable redirect responses, and making `LiveSearch` more configurable for custom result/search-page routing.

## Detailed Summary

## 1. Media Upload And Content-Term Management In Core

Commit: `f512382`

This is the largest and most substantive core change in Auggernaut’s authored history here.

### Media upload changes

Media upload logic was moved into a shared runtime entrypoint instead of being assembled directly inside the HTTP route.

What changed:

- Added `handleMediaUpload` to the runtime handler surface
- Updated the Astro handler types so middleware and routes can call `handleMediaUpload`
- Changed `POST /_emdash/api/media` to delegate to the shared runtime upload path
- Added raw byte support to the upload contract so callers can pass the file body directly
- Added optional thumbnail byte input for placeholder generation
- Added a maximum upload size check in runtime (`50 MB`)
- Added content-hash deduplication before creating a new media record
- Added storage-key generation in runtime based on a ULID plus the original filename extension
- Uploaded the file through the configured storage adapter from runtime
- Generated image placeholders in runtime, optionally using a client-supplied thumbnail instead of the full source image
- Cleaned up the uploaded object from storage if media record creation fails
- Returned deduplicated media when the same content hash already exists

Why it matters:

- HTTP and MCP can share the same upload behavior
- Deduplication is no longer route-local
- Upload cleanup behavior is centralized
- Placeholder generation is no longer duplicated in route code

Files touched:

- `packages/core/src/astro/routes/api/media.ts`
- `packages/core/src/emdash-runtime.ts`
- `packages/core/src/astro/types.ts`

### Content-term assignment changes

Content-term assignment was promoted into shared taxonomy handlers instead of being implemented ad hoc inside the route.

What changed:

- Added `handleContentTermsGet`
- Added `handleContentTermsSet`
- Added new response types for content-term payloads
- Added lookup logic that resolves a content item by ID or slug before taxonomy assignment
- Validated taxonomy existence before reading or writing assigned terms
- Validated that each provided term exists
- Validated that each provided term belongs to the requested taxonomy
- Normalized assigned-term responses into a consistent shape
- Changed the content-term route to call the shared handlers instead of talking directly to `TaxonomyRepository`

Why it matters:

- The logic is reusable across API surfaces
- ID-or-slug resolution is handled consistently
- Validation is not duplicated between route and MCP layers

Files touched:

- `packages/core/src/api/handlers/taxonomies.ts`
- `packages/core/src/api/handlers/index.ts`
- `packages/core/src/astro/routes/api/content/[collection]/[id]/terms/[taxonomy].ts`
- `packages/core/src/index.ts`
- `packages/core/src/astro/middleware.ts`

## 2. MCP Expansion For Editorial Workflows

Commit: `f512382`

Auggernaut also expanded the MCP server substantially in the same commit.

### New MCP tools

Added:

- `media_upload`
- `content_get_terms`
- `content_set_terms`

What those do:

- `media_upload` accepts standard base64 file bytes, decodes them to raw bytes, and calls the shared runtime upload path
- `content_get_terms` reads assigned taxonomy terms for a content item
- `content_set_terms` replaces assigned taxonomy terms for a content item

### Canonical taxonomy MCP behavior

The MCP taxonomy tools were also aligned with the canonical taxonomy handlers.

What changed:

- Term listing now goes through `handleTermList`
- Term creation now goes through `handleTermCreate`
- Hierarchical term trees are flattened for MCP pagination/listing output instead of being queried manually with separate SQL

### Ownership and authorization fixes in MCP

The MCP server changed in a few important authorization areas:

- Replaced the old `extractContentAuthorId` behavior with `extractContentOwnerId`
- Stopped throwing an internal error when content has no `authorId`
- Allowed ownership checks to fall back correctly for editor-level permissions on authorless/imported content
- Added optional `authorId` support on MCP create/update operations
- Restricted explicit `authorId` reassignment so it requires the right permission
- Preserved ownership checks around create/update/publish/delete flows
- Resolved slug inputs to canonical IDs before term operations

### Base64 support

To support binary media upload in MCP:

- Added `decodeBase64ToBytes`
- Kept string decoding separate from raw byte decoding

Files touched:

- `packages/core/src/mcp/server.ts`
- `packages/core/src/utils/base64.ts`
- `packages/core/src/astro/types.ts`
- `packages/core/src/emdash-runtime.ts`

## 3. Test Coverage Added For MCP And Taxonomy Behavior

Commit: `f512382`

This commit also added a large amount of regression coverage.

### Expanded authorization coverage

`packages/core/tests/unit/mcp/authorization.test.ts` was extended to cover:

- author users creating content for themselves
- author users being blocked from creating content for other users
- editor users explicitly reassigning ownership
- author users being blocked from reassigning ownership
- scope enforcement for `content_set_terms`
- scope enforcement for `media_upload`
- successful `content_get_terms` and `media_upload` flows with the right scopes
- ownership enforcement on `content_set_terms`
- slug-to-ID resolution before content-term handler calls
- behavior when content has no `authorId`
- editor access to authorless content

### New taxonomy MCP tests

Added `packages/core/tests/unit/mcp/taxonomy-tools.test.ts` to verify:

- MCP term listing reads from the canonical taxonomy tables
- MCP term creation writes to the canonical taxonomy tables

## 4. Route Injection Should Not Override User Public Routes

Commit: `4bacbe6`

This core change was small but useful.

What changed:

- `injectCoreRoutes` now accepts `srcDir`
- Added `hasUserDefinedPublicRoute`
- Before injecting root-level public routes like `sitemap.xml` and `robots.txt`, core now checks whether the site already defines those files in `src/pages`
- If the user has their own public route file, core does not inject its built-in route on top of it

Why it matters:

- Site authors can override the public sitemap/robots routes cleanly
- EmDash no longer assumes it should always own those root-level files

Files touched:

- `packages/core/src/astro/integration/index.ts`
- `packages/core/src/astro/integration/routes.ts`
- `packages/core/tests/unit/astro/routes.test.ts`

## 5. Public Route Detection Was Split Out Of Auth Middleware

Commit: `2a4dba2`

This commit cleaned up middleware routing logic and adjusted what counts as a public EmDash route.

What changed:

- Extracted public-route matching into `src/astro/middleware/public-routes.ts`
- Changed auth middleware to call the shared `isPublicEmDashRoute(pathname, isDev)` helper instead of embedding the route lists inline
- Marked the public search endpoints as public:
  - `/_emdash/api/search`
  - `/_emdash/api/search/suggest`
- Kept admin-style search endpoints private:
  - `/_emdash/api/search/rebuild`
  - `/_emdash/api/search/stats`
  - `/_emdash/api/search/enable`
- Added unit coverage for that public/private route distinction

Why it matters:

- Route visibility is easier to reason about and test
- Search and suggest can be used from the public site without auth middleware treating them as private admin APIs

Files touched:

- `packages/core/src/astro/middleware/auth.ts`
- `packages/core/src/astro/middleware/public-routes.ts`
- `packages/core/tests/unit/astro/middleware/auth.test.ts`

## 6. Dev Build And Admin Locale Resolution Adjustments

Commit: `2a4dba2`

This same commit also made two practical tooling/runtime changes in core:

- Changed the core package `dev` script from `tsdown --watch` to `tsdown --watch --no-clean`
- Updated admin locale aliasing to use a regex-based replacement instead of the previous glob-style alias
- Forced the built admin bundle to be used even in dev because the source-mode alias path was leaving Lingui macro imports in the client runtime

Why it matters:

- Dev watch mode avoids cleaning outputs on each rebuild
- Admin locale resolution is more robust
- Dev mode avoids a known failure mode in the admin source alias path

Files touched:

- `packages/core/package.json`
- `packages/core/src/astro/integration/vite-config.ts`

## 7. Baseline Security Headers Were Centralized And Made Safe For Redirect Responses

Commit: `a77a0b1`

This core change extracted the baseline response-header logic into a dedicated helper.

What changed:

- Moved baseline security header behavior out of middleware-local code into `applyBaselineSecurityHeaders`
- Middleware now applies baseline headers by calling the shared helper
- Added logic to detect immutable response headers
- When a response has immutable headers, the helper clones the response and reapplies headers on the clone
- Preserved redirect status and `Location` when cloning immutable redirect responses

Headers covered:

- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options` when no CSP header is already set

Why it matters:

- Redirect responses no longer break when middleware tries to add headers
- Baseline security header logic now lives in one reusable/tested place

Files touched:

- `packages/core/src/astro/middleware.ts`
- `packages/core/src/astro/response-headers.ts`
- `packages/core/tests/unit/astro/response-headers.test.ts`

## 8. LiveSearch Became More Configurable For Frontend Routing

Commit: `0f9094e`

Although this commit was primarily about the TTRPG demo setup, it included one real `packages/core` change to `LiveSearch`.

What changed:

- Added a `style` prop for inline container styling
- Added a `searchPage` prop
- Added a `routeMap` prop for per-collection URL templates
- Added Enter-key behavior that navigates to a dedicated search page with `?q=...` when no result is focused
- Replaced hardcoded result URLs with a `buildResultUrl` helper
- Allowed result URLs to be built from a route template using placeholders like:
  - `:collection`
  - `:id`
  - `:slug`
  - `:path`

Why it matters:

- `LiveSearch` can be used in sites that do not follow the default `/{collection}/{slug}` URL shape
- Search UIs can redirect users to a dedicated results page instead of requiring inline result selection

Files touched:

- `packages/core/src/components/LiveSearch.astro`

## Practical “Ask Your AI To Make These Changes” Version

If you want a concise directive version that still stays within this authored scope:

1. Add a shared runtime media-upload handler that enforces size limits, deduplicates by content hash, uploads via storage, generates placeholders, and cleans up storage on failure.
2. Move content-term assignment into shared taxonomy handlers that resolve content by ID or slug and validate term/taxonomy membership.
3. Expose those media and taxonomy flows through MCP with base64 upload support and explicit scope/ownership enforcement.
4. Fix MCP ownership logic so editor-level users can operate on authorless content without the server treating that as an internal error.
5. Make core route injection skip built-in `sitemap.xml` and `robots.txt` when the site already defines those routes.
6. Split public-route detection out of auth middleware and explicitly treat public search endpoints as public while keeping admin search endpoints private.
7. Centralize baseline security headers in a helper that can safely clone immutable redirect responses before mutating headers.
8. Make `LiveSearch` support custom route templates and an optional dedicated search-results page.

## Notes

- This file intentionally excludes merge commits by Auggernaut.
- This file intentionally excludes upstream commits by other authors.
- At the time this file was rewritten, `packages/core` had no additional uncommitted code changes beyond this documentation file itself.
