---
name: ttrpg-category-editorial
description: Use when editing or expanding TTRPG category pages in the EmDash demo, especially for hero copy, top picks, category-specific game blurbs, FAQs, related categories, and SEO.
---

# TTRPG Category Editorial

Use this skill for category-page editorial work in `/Users/home/Dev/git/emdash/demos/ttrpg-games`.

## Source Of Truth

- Treat `/Users/home/Dev/git/emdash/demos/ttrpg-games/data.db` as the live source of truth.
- Do not update CSVs or the seed script unless the user explicitly asks.

## Category Page Model

Category editorial content currently lives on `ec_category_pages`:

- `description`
  Keep for metadata, admin summaries, and fallback text. Do not rely on it as the visible hero intro when `body_html` exists.
- `body_html`
  Use for the visible hero intro. This should orient the visitor and set up the page.
- `game_notes`
  JSON array for per-game, category-specific card blurbs plus featured-pick metadata.
- `faqs`
  JSON array for the main decision-support section on the page.
- `related_categories`
  JSON array for cross-links to nearby categories.

## Hero Rules

- Use a descriptive H1:
  `Best {Category} TTRPGs`
- Keep the eyebrow as the taxonomy type, for example `Genres` or `Mechanics`.
- Prefer `body_html` over `description` for the visible hero copy.
- Hero copy should:
  define the category,
  explain why a visitor would browse it,
  set up the rest of the page.
- Hero copy should not turn into a comparison section.

## Top Picks

- Use 3-5 featured games when possible.
- `featured_reason` should be richer than the standard card blurb.
- A top-pick explanation should answer why to start with that game, not just restate the premise.

## Category-Specific Game Blurbs

- Write each card blurb through the lens of the current category.
- Avoid meta phrases like:
  `fits here`
  `belongs here`
  `this category fits`
- Prefer direct editorial framing:
  what this game does with the category theme,
  what angle it represents,
  why someone browsing this category might click it.

## FAQ Rules

- Use the FAQ section as the main deeper decision-support block.
- FAQs can absorb comparison logic if the likely user questions are comparative.
- Good FAQ prompts are things like:
  `Which game is best for horror?`
  `Which game is best for diplomacy and first contact?`
  `Which option works best for solo play?`
- FAQ answers should help users choose, not pad the page.

## Cross-Links

- Related categories should help visitors continue browsing logically.
- Cross-link reasons should explain the difference between this category and the next one.

## SEO Rules

- Set a custom SEO title and description in `_emdash_seo` for important category pages.
- Keep title tags more explicit than the visible H1 when useful.
- Maintain breadcrumbs in the visible page and structured data.

## Workflow

1. Review the current category page data in `ec_category_pages`.
2. Rewrite `body_html` for the hero if needed.
3. Update `game_notes` blurbs and featured picks.
4. Add or tighten FAQs.
5. Add or revise related-category links.
6. Update `_emdash_seo`.
7. Run:
   `ASTRO_TELEMETRY_DISABLED=1 pnpm --filter @emdash-cms/demo-ttrpg-games typecheck`
   `ASTRO_TELEMETRY_DISABLED=1 pnpm --filter @emdash-cms/demo-ttrpg-games build`

## Current Template Decisions

- Category hero uses `body_html` as the visible intro.
- Visible H1 pattern is `Best {Category} TTRPGs`.
- `description` is not the primary visible hero copy when `body_html` exists.
- There is one FAQ section instead of separate FAQ and comparison sections.
- `Aliens` is the current reference example for this structure.
