# Live Verification — prove it actually works in production

Applying SEO to the codebase is only half the job. Until the changes are deployed **and verified on the
live site**, you don't know whether they work: template engines can mangle output, a CDN can shadow your
robots.txt, link generation can point at a non-canonical URL, and a deploy can land half-finished. None
of that is visible in the source.

This protocol runs from the **`/seo-live` command**, after the user tells you they've deployed. It is
owned by the **orchestrator**, not the apply specialists (verification is centralized — see `safety.md`).

## Why this exists (field-proven)
In the first real-world run, build + static file checks caught **1 of 4** genuine defects. The other
three only appeared when the running site was fetched over HTTP:
- a template engine HTML-encoded `application/ld+json` into `application/ld&#x2B;json` — valid in the
  file, broken in the output;
- framework link generation emitted a non-canonical URL site-wide, so the site fed its own duplicate;
- `sitemap.xml` shipped with a UTF-8 BOM — invisible in the file, visible in the bytes.

Assume nothing is real until you've fetched it.

## Step 0 — Establish the live URL and deploy state
Read the site URL from `state.json` (`project.siteUrl`); ask only if it's genuinely unknown.

Then decide **deployed vs not deployed** before reporting anything as broken:
- Fetch a page you changed and look for a marker of your work (a canonical tag, a JSON-LD block, the
  new meta description).
- **If the changes aren't there**, say so plainly — *"I can't see these changes live yet; the deploy
  may not have gone out, or a cache may still be serving the old version."* — and stop. **Do not
  report the site as broken.** A false alarm
  here destroys trust faster than a missed issue.
- If they are there, continue.

## Layer 1 — HTTP / artifacts (cheap, catches the CDN class)
- **`robots.txt`: compare live output against what the code produces.** If they differ, an edge/CDN layer
  is overriding the origin — see `cdn-layer.md`. This is the single highest-value check here, and it is
  invisible from the repo.
- `sitemap.xml`: valid XML, **no BOM** (check the first bytes, not the file), `<loc>` URLs return 200.
- `llms.txt`, OG image, favicon set, web manifest: 200 and non-trivial size.
- Every indexable route: expected status. Redirects that should be **301** actually are (a duplicate
  route left as 200 keeps feeding duplicate content).

## Layer 2 — Rendered HTML (catches the encoding / link-generation class)
Fetch the raw HTML and inspect the **response text**, not the source file:
- **JSON-LD**: the literal string `application/ld+json` must appear in the raw response (a `+` encoded as
  `&#x2B;` means text-matching tools — and some parsers — miss it entirely). Then **extract each block and
  parse it as JSON**; "a script tag exists" is not verification.
- **Canonical**: correct absolute value per page; and **internal links point at the canonical variant**.
  Extract the rendered `href`s — frameworks with multiple routes bound to one action can emit the wrong one.
- **`<meta name="robots">`**: present on pages that must not be indexed (auth, error, result/token pages),
  absent on pages that should rank.
- **Title / meta description**: unique per page, within the budgets in `standards.md`.

## Layer 3 — Browser (chrome-devtools) — what only a real browser reveals
- **JS-rendered content**: is the key content in the DOM after hydration? (SPA/GEO gap — see `geo.md` Tier 1.)
- **Analytics actually fires**: observe the outgoing GA4/measurement request on a real page load. A tag in
  the HTML is not proof it runs.
- **Real load behavior**: LCP-ish timing, layout shift, obvious console errors (thresholds in `standards.md`).
- Capture a screenshot for the record.

Use the bundled chrome-devtools MCP. Keep it to the key pages — this is verification, not a crawl.

**One deliberate exception: link integrity.** "Key pages only" is right for the browser layer and wrong
for item 13 — broken links live on the pages nobody nominates as key (auth, legal, help), and those are
exactly the ones a `noindex`-aware, sitemap-driven page list leaves out. Run
`validate-artifacts.mjs --url` so the link crawl reaches them; it is cheap (HEAD requests, bounded by
`--max-links`) and needs no browser.

## Reporting & the fix loop (the user chose: report **and** offer to fix)
Split every finding into two buckets, because they're fixed in different places:
- **Code-side** (template output, canonical, redirects, missing artifacts) → run the normal butler flow:
  plan → approval → apply → then tell the user: *"Deploy again and call me back with `/seo-live`."*
- **Panel / CDN-side** (edge robots.txt override, AI-bot blocking, WAF rules) → these are not in the repo.
  Walk the user through fixing them in the provider's dashboard (`cdn-layer.md`), in their logged-in browser.

**The loop stays open until live is clean.** Don't declare success while a finding is outstanding.

## Update state
Record in `state.json`'s `deploy` block (see `state-schema.md`): `deployedAt`, `liveVerifiedAt`, `liveUrl`,
the live findings, and the **live score**. The score card then reports both numbers — applied vs live —
so "95" can never be mistaken for "live and working" (see `scorecard.md`).

## Honesty
- If you cannot reach the site (DNS, auth wall, 403), say so and stop — never infer a pass.
- if chrome-devtools isn't available, run Layers 1–2 and state clearly that the browser layer was skipped.
- Report exactly which checks ran, which passed, and which couldn't be performed.
