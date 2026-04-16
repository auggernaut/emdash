This is the TTRPG Games site inside the EmDash monorepo.

## Default Assumption

When the user starts a conversation from this repository and asks to change "the site", assume they
mean this site at `sites/ttrpg-games/`, not the EmDash framework, docs site, demos, or templates,
unless they explicitly say otherwise.

## Scope Rules

- Prefer changing files under `sites/ttrpg-games/`.
- Only touch `packages/`, `docs/`, `templates/`, or other monorepo areas when the user explicitly asks
  for framework work or the site task cannot be completed without a supporting fix there.
- If a request is ambiguous between site content/design and core EmDash behavior, default to the site.
- When running dev commands for site work, run them from `sites/ttrpg-games/` unless there is a clear
  reason to work from the monorepo root.

## Site Context

- This site is an EmDash-powered Astro app.
- Treat it as the primary product surface for user-facing copy, SEO, content modeling, curation, and
  frontend work in this repository.
- In user-facing copy and SEO text, prefer `TTRPG` / `TTRPGs` over the broader `RPG` / `RPGs`
  unless the user explicitly asks for different terminology or a quoted source requires the original wording.
