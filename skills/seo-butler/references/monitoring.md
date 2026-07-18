# Monitoring — the read-only watchdog

Code doesn't rot on its own, but **live sites do**: a CDN setting flips, a deploy drops a tag, Google
de-indexes a page, Core Web Vitals drift as traffic changes, a teammate ships a new page with no metadata.
`/seo-watch` catches that between full runs.

**It never changes anything.** A periodic run happens while the user isn't watching, so it cannot present
a plan or take approval — and every change in this plugin goes through plan + approval. The watchdog's job
is to notice and say so; fixing is always a supervised `/seo` or `/seo-live` run afterwards.

The only file it writes is the butler's own `state.json` (appending this check to history). It never edits
the user's code, never commits, never touches dashboards that would require a login prompt, and never asks
questions — it must complete unattended.

## The baseline
Everything is a comparison against `state.json`: `items` (what was done), `deploy` (what was verified
live), and `measurements` (the last real numbers). Without a baseline there's nothing to diff — if
`state.json` is missing, say so and tell the user to run `/seo` first rather than inventing one.

## What it checks

**1. Live health (read-only fetches)**
- Every known indexable route still returns its expected status — a route that used to be 200 and now
  isn't is the loudest possible signal.
- **`robots.txt` compared against the last known content.** Any difference at all is reported: this is
  where silent CDN/edge drift shows up (`cdn-layer.md`), and it can de-list a site overnight.
- `sitemap.xml` still valid and reachable; `llms.txt`, OG image, favicons, manifest still 200.
- On key pages, the rendered output still has what we put there: canonical, `<meta name="robots">` where
  required, JSON-LD present as literal `application/ld+json` and still parsing, analytics tag present.

**2. Real measurement drift** (`measurement.md`)
Re-run Lighthouse via PSI and read CrUX, then **diff against the stored measurements**.

**3. New, untreated pages**
If the site has routes that aren't in `state.json`, flag them: someone shipped pages that never went
through the butler and probably have no metadata.

**4. Google's view (opportunistic)**
Search Console indexing/coverage — but an unattended run usually has **no logged-in browser**. Attempt it,
and if it isn't available, record it as skipped with the reason. Never treat "couldn't check" as "fine".

## Noise control — the watchdog must not cry wolf
A monitor that fires on nothing loses its audience. Report only:
- **robots.txt / route status / missing artifact / broken JSON-LD** → *any* change. These are binary and
  high-signal; zero tolerance.
- **Lighthouse** → a drop of **≥5 points** in a category, or a category falling below a floor (SEO or
  Accessibility under 90). Performance bounces run to run — ignore small swings entirely.
- **Core Web Vitals** → only when a metric **crosses a threshold boundary** from `standards.md`
  (e.g. INP moving from ≤200ms into the needs-improvement band), not on every fluctuation.
- **Indexed pages** → a meaningful drop, not ±1.

Everything else is stored silently as history.

## Reporting
If nothing meaningful changed, say exactly that — briefly:
> *"All stable ✅ — nothing meaningful has changed since the last check."*

If something did, lead with what changed, since when, and the likely cause — then hand off:
```
⚠️ 2 changes found (last check: 2026-07-15)

• robots.txt changed on the live site — Disallow added for 9 bots
  Likely cause: a CDN/edge setting (see cdn-layer.md). HIGHEST PRIORITY.
• Lighthouse SEO 100 → 88 (/pricing)
  The canonical tag is gone — probably dropped by a deploy.

To fix: /seo (code side) · /seo-live (live re-verification)
```
Rank findings by impact: anything that can de-index the site comes first.

## Scheduling
The plugin cannot schedule itself — the user wires it up, and the right mechanism depends on their setup
(Claude Code's scheduling, a CI job, or their own cron). Weekly is a sensible default: frequent enough to
catch drift, rare enough to stay quiet. Whatever the schedule, the run must stay unattended-safe, which is
exactly why this command is read-only.
