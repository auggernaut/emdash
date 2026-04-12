# Cloudflare No-Trailing-Slash Redirect

Apply this as a **Single Redirect** rule in Cloudflare when `ttrpg-games.com` is moved behind Cloudflare.

## Rule

- Phase: `http_request_dynamic_redirect`
- Match expression:

```txt
http.request.uri.path ne "/" and ends_with(http.request.uri.path, "/") and not starts_with(http.request.uri.path, "/_emdash/")
```

- Redirect type: `Dynamic`
- Target URL expression:

```txt
regex_replace(http.request.uri.path, "/+$", "")
```

- Status code: `301`
- Preserve query string: `Enabled`

## Effect

- `/blog/` -> `/blog`
- `/item/ars-magica/` -> `/item/ars-magica`
- `/category/aliens/` -> `/category/aliens`
- `/?q=test` is unchanged because `/` is excluded
- `/_emdash/...` is excluded

## Notes

- The app sitemap already emits no-trailing-slash URLs.
- The Astro app is configured with `trailingSlash: "never"`.
- This Cloudflare rule is the last piece needed so slash variants redirect instead of 404ing or resolving separately.

## Sources

- Cloudflare dynamic redirect examples:
  https://developers.cloudflare.com/rules/url-forwarding/examples/remove-locale-url/
- Cloudflare rules language functions:
  https://developers.cloudflare.com/ruleset-engine/rules-language/functions/
