---
description: Read-only watchdog — check the live site for regressions since the last run and report what changed
argument-hint: "[optional: live URL, if it isn't already in state]"
---

# SEO Butler — Watch (read-only)

Periodic regression check. Code doesn't rot on its own, but live sites do: a CDN setting flips, a deploy
drops a tag, a page falls out of the index, Core Web Vitals drift, a teammate ships pages with no metadata.

## The one rule that shapes everything

**This command never changes anything.** It is built to run unattended — on a schedule, with nobody there
to approve a plan. Since every change in this plugin goes through plan + approval, an unsupervised fix
would break that chain. So: notice, report, hand off. Fixing is always a supervised `/seo` or
`/seo-live` afterwards.

Concretely: no edits to the user's code, no commits, no dashboard actions needing a login prompt, no
questions. The only write is appending this check to the butler's own `.seo-butler/state.json` history.

## Load your protocol
Read **`${CLAUDE_PLUGIN_ROOT}/skills/seo-butler/references/monitoring.md`** and follow it. You'll also use
`measurement.md` (how to re-measure), `standards.md` (thresholds), `cdn-layer.md` (what a robots.txt change
means), and `state-schema.md` (the baseline and where history goes).

## The flow

1. **Load the baseline** from `./.seo-butler/state.json` — `items`, `deploy`, `measurements`. If there is
   no state file there's nothing to compare against: say so and tell the user to run `/seo` first.
   Don't invent a baseline.

2. **Check live health** (read-only fetches): known routes still return their expected status; **live
   `robots.txt` compared byte-for-byte against the last known content** (this is where silent CDN drift
   shows up and it can de-list a site); sitemap valid and reachable; llms.txt / OG image / favicons still
   200; and on key pages the rendered output still carries canonical, the right `<meta name="robots">`,
   parseable `application/ld+json`, and the analytics tag.

3. **Re-measure and diff** — Lighthouse via PSI plus CrUX (`measurement.md`), compared against the stored
   measurements.

4. **Spot untreated pages** — routes that exist now but aren't in `state.json` were shipped without the
   butler and probably have no metadata.

5. **Google's view, if reachable** — Search Console indexing/coverage. An unattended run usually has no
   logged-in browser; if so, record it as skipped **with the reason**. "Couldn't check" is never "fine".

6. **Report, applying the noise thresholds** in `monitoring.md` — binary things (robots.txt, route status,
   missing artifacts, broken JSON-LD) on any change; Lighthouse only on a ≥5-point drop or a category below
   90; Core Web Vitals only when a metric crosses a threshold band. If nothing meaningful changed, say so
   in one line. Rank findings by impact — anything that can de-index the site comes first — and close with
   the hand-off: `/seo` for code-side, `/seo-live` for live re-verification.

7. **Append to history** in `state.json` so the next check has a fresh baseline and you can show movement
   over time.

## Rules
- Reply in the user's language.
- Be quiet when things are fine. A monitor that fires on noise gets ignored, and then it's worthless.
- Never estimate a number you couldn't measure, and never let a skipped check read as a pass.
