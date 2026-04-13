---
name: ttrpg-game-curation
description: Curate standalone tabletop RPG entries for the ttrpg-games site. Use when adding a new game, enriching an existing game, choosing taxonomies, writing category fit blurbs, finding cover art, summarizing reviews, or curating related games in the live EmDash database.
---

# TTRPG Game Curation

Use this skill for `/Users/home/Dev/git/emdash/sites/ttrpg-games` when the task is about adding or enriching a game entry in the directory.

## Scope

This site is a directory of standalone games. Treat the live database as the source of truth:

- Live DB: `/Users/home/Dev/git/emdash/sites/ttrpg-games/data.db`
- Backups: `/Users/home/Dev/git/emdash/sites/ttrpg-games/backups/`
- Do not treat `seed/seed.json` as the primary editing surface unless the user explicitly asks for seed work.

When possible, use the EmDash MCP/API surface for content operations instead of writing rows directly.

- Prefer MCP for content create/update/delete, taxonomy assignment, and category-page updates.
- Use direct DB edits only for verification, emergency repair, or when the current MCP/API surface genuinely cannot perform the change.
- For local `ttrpg-games` work, the MCP server runs from the dev site at `/_emdash/api/mcp` when enabled.

## Workflow

### 1. Back up before data edits

Before changing the live site data, copy `data.db` into `backups/` with a timestamped filename.

Do this even if the actual content mutation will happen through MCP, since the local site still persists to `data.db`.

### 2. Check for an existing or legacy entry before creating a new one

Do not assume a “missing” game is truly missing.

Before creating a new entry:

- check whether the game already exists under an older slug format
- check whether category pages or related-game arrays already reference a legacy slug
- prefer reconciling and upgrading the existing live row instead of creating a duplicate

If the site already has an established public slug, preserve it unless there is a strong reason to change it.

### 3. Fill the game entry completely

When adding a game, do not stop at title + blurb.

Populate the entry with:

- `at_a_glance`
- cover image URL
- `website_url`
- publisher/creator
- short blurb
- `review_summary`
- rich `body_html`
- structured decision fields already used by the site
- related games
- taxonomy assignments

Leave a field blank only if you genuinely cannot support it with reliable information.

### 4. Write `body_html` as a review, not a metadata dump

The body should not just restate decision fields or the fit guide.

Write it like a real directory review:

- explain what the game is
- describe the theme and setting
- explain what play feels like at the table
- call out standout mechanics or procedures
- note what makes it distinct from adjacent games
- mention any constraints, friction, or who it may not suit

The body should add depth that the structured data does not already provide.

### 5. Use the best cover image and move it to Cloudinary

Do not leave third-party hotlinked art in place if a Cloudinary-hosted copy is expected.

Image workflow:

- find the best available cover or representative official image
- prefer official publisher/store assets over random reposts
- upload it to the project’s Cloudinary account
- store the Cloudinary URL in the game entry

For this site:

- game cover images belong on Cloudinary
- EmDash media storage is not the canonical home for directory cover art
- if you temporarily use EmDash media to test MCP upload behavior, move the final cover back to Cloudinary before treating the work as complete

If the official source is blocked or unusable, choose the best stable fallback and note that choice in your summary to the user.

### 6. Summarize review sentiment

Try DriveThruRPG first for user reviews.

If the game is not on DriveThruRPG or does not have usable review volume, fall back to credible user-review sources. Summarize the consensus in original prose. Do not paste long quotes.

Any DriveThruRPG link you store should include the affiliate id `affiliate_id=1659151`, with that parameter present exactly once.

Any itch.io link you store should include the affiliate code `ac=YUqaLN4pVvG`, with that parameter present exactly once.

`review_summary` should describe the review pattern, not your own opinion alone.

### 7. Curate related games deliberately

Add related games as editorial comparisons, not generic “similar games.”

For each related item:

- compare the current game to the related game
- explain what they share
- explain how they differ
- make the blurb about the relationship between the two games

Do not write vague filler such as “fans of this may also like that.” The comparison should help a player or group decide which direction to go next.

Default target: 3 related games unless the page already uses a different pattern.

### 8. Assign categories carefully

Choose the best-fitting taxonomies only. Do not pad category coverage.

Prefer high-confidence assignments supported by the actual game text, rules, and positioning.

### 9. Write category-specific fit blurbs

After assigning categories, update the relevant category pages so the game has a `fit_blurb` in each assigned category.

Each fit blurb should answer why this game belongs in that specific category. It should not reuse the game’s generic blurb.

When updating published category pages through MCP:

- `content_update` creates or changes the draft
- you must follow it with `content_publish` if you want the live page to reflect the new fit blurbs

Do not assume the update is live until the page has been published again.

## MCP-specific operating rules

When using MCP for this site:

- create or update the game entry through `content_create` / `content_update`
- use `content_set_terms` for taxonomy assignment
- use `content_get` + `content_update` for category-page `game_notes`
- if the target page is published and should change live, follow with `content_publish`

For author ownership:

- new or reconciled entries should use the user’s real account id as `authorId`
- editors may intentionally preserve or reassign `authorId` when reconciling older entries
- do not leave newly curated production-style content owned by a throwaway dev-bypass user

For reconciliation work:

- if a duplicate was created under a new slug but the live site already uses an older canonical slug, migrate the richer content onto the canonical row
- then trash or delete the accidental duplicate
- clean up category-page references so they only point at the canonical slug

## Standards

- This directory is for standalone games, not supplements.
- Be strict with taxonomy meaning. If a category is editorially narrow, keep it narrow.
- Related-game blurbs should be comparative.
- `body_html` should be richer than the structured fields.
- Images should end up on Cloudinary.
- Reviews should reflect user sentiment from DriveThruRPG first, then fallback sources if needed.
- DriveThruRPG links should include `affiliate_id=1659151`.
- itch.io links should include `ac=YUqaLN4pVvG`.
- Preserve established live slugs when reconciling older entries.
- MCP updates to published content are not live until published.

## Verification

After finishing:

- verify the game row has the expected rich fields populated
- verify `image_url` points to Cloudinary
- verify the canonical slug is the one the site should actually keep
- verify related games exist and the related blurbs are comparative
- verify taxonomy assignments were written
- verify category-page fit blurbs exist for the assigned categories
- if category pages were updated through MCP, verify they were published and the live `game_notes` contain the target slug
- verify any stored itch.io links include `ac=YUqaLN4pVvG`
- run `pnpm --silent lint:quick` from `/Users/home/Dev/git/emdash`

If code changed, also run the relevant typecheck.
