# website-utils

Marketing measurement script for the ovice corporate website (www.ovice.com).

## What this is

`utils.js` is a small front-end script loaded on every page of the corporate website.
It determines where the visitor came from, keeps that information in `localStorage`,
and appends it as URL query parameters when the visitor navigates to a form, so the
originating channel can be recorded in the CRM.

One file, no build step, no package manager. It depends on jQuery, which the site
already loads.

## How it is served

Through jsDelivr, from a tag in this repository:

```html
<script src='https://cdn.jsdelivr.net/gh/oviceinc/website-utils@037/utils.js'></script>
```

The reference lives in the website's custom code and is updated at release time.

## Releasing

1. Merge the change into `main`
2. Create and push a tag matching the `global_utils` build number in the code
   (e.g. `global_utils = 37` → tag `037`)
3. Update the `<script>` reference on the site and publish

**Always reference a tag. Never move an existing tag, and never point the site at a
branch.**

jsDelivr's caching depends on the reference type:

| Reference | `Cache-Control` |
|---|---|
| Tag, commit SHA | `max-age=31536000, immutable` |
| Branch | `max-age=604800, s-maxage=43200` |

A branch reference is cached **in the browser for up to 7 days**. A bad push to a branch
that the site points at therefore cannot be rolled back promptly — returning visitors
keep the broken file. Tags are immutable, so rolling back is just pointing the site at
the previous tag, which takes effect immediately.

## Verifying a change before releasing

Any commit is retrievable from jsDelivr by its SHA, with the same immutable caching:

```
https://cdn.jsdelivr.net/gh/oviceinc/website-utils@<commit-sha>/utils.js
```

Use that URL to test on a staging environment before creating a tag. This keeps
unreleased code out of the tag namespace and off production.

## Testing

`test/test-utils.js` runs the script under Node with `window`, `document`,
`localStorage`, `sessionStorage` and `$` stubbed. It simulates page navigation by
sharing `localStorage` across page loads, so it can assert what happens when a visitor
moves through the site before reaching a form.

```bash
node test/test-utils.js
```

Pass a path to check a different file:

```bash
node test/test-utils.js ../utils.js
```

No dependencies. Exits non-zero if any assertion fails.

## Query parameters

Two families of parameters are involved.

| Parameter | Purpose |
|---|---|
| `mark_source`, `mark_first`, `mark_pages`, `mark_visits` | ovice's own attribution values, recorded in the CRM. On links to the trial form the short forms `ms`, `mf`, `mp`, `mv` are used instead. |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid` | Standard advertising parameters. |

Both families are persisted in `localStorage` and re-applied when the visitor navigates
to a form, so they survive navigation within the site.

They differ in coverage, which is why both exist. `mark_source` is derived from the
referrer when no explicit value arrives, so **every** visit carries one. `utm_*` only
exists when someone tagged the inbound link, so organic, direct and referral traffic
has none. `utm_*` in exchange carries campaign-level detail that the coded
`mark_source` values cannot express.

### `localStorage` keys

| Key | Contents |
|---|---|
| `ovicecom_attribution` | Current attribution value |
| `ovicecom_sFirstRef` | Attribution of the first ever visit |
| `ovicecom_sLastRef` | Attribution of the most recent visit |
| `ovicecom_cVisits` | Visit count |
| `ovicecom_cPages` | Page view count |
| `ovicecom_nLastTime` | Timestamp of the last page view |
| `ovicecom_sAds` | `utm_*` and `gclid`, as JSON with a `ts` field. Expires after 30 days. |
| `ovicecom_utils` | Build number of the script that last wrote these keys |

Setting `sessionStorage.ovicecom_fEntry = '99'` and reloading clears all of the above.
This is intended for testing.

## Notes on behaviour

- `utm_*` values are replaced as a set. If any `utm_*` parameter arrives, all five are
  replaced, so values from different campaigns are never mixed. `gclid` is independent.
  The flip side: tagging an **internal** link with only part of a set (say
  `?utm_content=hero`) discards the acquisition source. Keep `utm_*` for inbound links.
- `utm_*` and `gclid` are not appended when the key is already present, either in the
  current page's URL or hardcoded on the link being clicked. In the latter case the
  value on the link wins. **`mark_*` has no such check** — a page URL already carrying
  `mark_source` produces it twice on the form link. Long-standing behaviour.
- A form link whose `href` contains a fragment (`...form#top`) gets the parameters
  appended after the fragment, where the server never sees them. Long-standing
  behaviour; avoid fragments on links to the form destinations.
- Handlers are bound at DOM ready, so links inserted later by other scripts (widgets,
  banners) do not get parameters.
- Storage policies can evict `localStorage` well before the 30 day expiry, so 30 days is
  an upper bound rather than a guarantee. Safari is the usual case.
- A failing `localStorage` write is swallowed on purpose. The store is written from a
  top-level IIFE, and an uncaught throw there would stop the script before the click
  handler is bound, costing every parameter on the page rather than just the ads record.
- The script only runs on pages that load it. Traffic that reaches a form directly,
  without passing through the website, carries no attribution.

## Ownership

Maintained by the Marketing team.

## History

Migrated here in August 2026 from a repository outside the organization. Build numbering
continues from that repository: tag `036` in this repository is byte-identical to the
file that was in production at the time of the migration, and exists as a rollback
target.
