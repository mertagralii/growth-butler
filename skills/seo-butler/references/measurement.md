# Measurement — real numbers from real tools

The butler's checklist score answers *"did we do the work?"*. It cannot answer *"is the site actually
good?"* — that's marking your own homework. This reference is how you get **independent verdicts** from
tools the user (and Google) actually trust.

Runs primarily from `/seo-live` (see `live-verification.md`), where a public URL unlocks everything.
Never fabricate a number: an unavailable measurement is reported as unavailable, with the reason.

## Three layers, in order of reliability

### Layer 1 — Deterministic validation (always runs, cannot fail from outside)

**Run the script — don't re-derive these checks by reading files and reasoning about them:**

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-artifacts.mjs --url https://<site> --root . --pages /,/pricing --json
```

`--root` alone works with no network (repo artifacts only); `--url` alone works with no repo; passing
both additionally diffs the repo's robots.txt against the live one, which is the only way an
edge/CDN override shows up. No dependencies, Node 18+.

What it decides, on raw bytes rather than on a belief about the raw bytes:
- **JSON-LD**: that the served response contains a *literal* `application/ld+json` (a template engine
  that HTML-encodes the `+` produces a page that builds, renders, and is invisible to every consumer),
  then `JSON.parse` on every block, then the `@type` inventory and whether Organization/WebSite exist.
- **sitemap.xml**: **no UTF-8 BOM** (a BOM makes strict parsers reject the whole file, and it is
  invisible in an editor), balanced tag structure, `<loc>` count, `<lastmod>` coverage.
- **robots.txt**: parses per-user-agent groups properly, has an absolute `Sitemap:` line, no blanket
  `Disallow: /`, and none of the six AI citation bots blocked.
- **Per page**: title/meta-description presence and length budget, canonical (single + absolute),
  `noindex` hygiene, the five core Open Graph tags, `twitter:card`, `<html lang>`, exactly one `<h1>`.

Two of those checks exist because a passing build and a clean file read still shipped a broken site.
Schema.org *required-field* depth beyond `@type` is still a judgement call — make it yourself, using
`standards.md`, on top of the script's parse result.

This layer is the floor. Even with no internet and no Chrome, `--root` still produces a real verdict.

### Layer 2 — Lighthouse (Google's own auditor)
Four scores: **Performance, SEO, Accessibility, Best Practices**. Two ways to get them:

**Live URL → PageSpeed Insights API (preferred).** One request returns **both** the Lighthouse lab result
**and** CrUX field data, and needs no local browser:
```
https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<encoded-url>&strategy=mobile
```
- Works without an API key at low volume; if you get rate-limited (HTTP 429), say so and offer that the
  user can supply a free key rather than silently giving up.
- Use `strategy=mobile` first — Google indexes mobile-first. Add `desktop` only if it's relevant.
- Only works for **publicly reachable** URLs (no localhost, no auth walls).

**Local URL → Lighthouse CLI via the bundled Chromium.** For a dev server before deploy:
```
npx lighthouse <url> --output=json --quiet --chrome-flags="--headless"
```
If it can't find a browser, point `CHROME_PATH` at the Chromium that ships with the bundled Playwright
MCP. If that still fails, **skip this layer and say so** — don't spend the run fighting it.

**Which pages:** the home page plus 2–3 pages that matter (a key landing page, a representative content
page). Auditing every route is slow and adds little; say which pages you measured.

### Layer 3 — Google's own view (opportunistic)
Best evidence when available, but conditional — never block on it:
- **CrUX field data** — comes back in the same PSI response (`loadingExperience` / `originLoadingExperience`):
  real-user LCP / INP / CLS. **If the site is new or low-traffic, Google returns nothing.** That is normal
  and must be reported as *"no field data yet — the site needs more traffic"*, never as a bad score.
- **Search Console** — via the user's already-logged-in browser (same approach as checklist items 32–33):
  indexed page count, coverage issues, and rich-results status. This is literally Google's verdict on the
  live site. Read-only unless the user asked for changes.

## Lab vs field — keep them apart
- **Lab** (Lighthouse) = a simulated load on one machine. Reproducible-ish, good for catching regressions,
  but **not** what users experience.
- **Field** (CrUX) = aggregated real users over time. Slower to move, far more meaningful.
They will disagree, and that's expected. Label every number with which it is, and never average them together.

## Interpreting responsibly
- **Performance scores bounce.** A few points between runs is noise. Only report a performance problem when
  it's clear (a failed Core Web Vitals threshold from `standards.md`, or a large, repeatable gap).
- SEO/Accessibility/Best-Practices scores are far more stable — treat their failures as real findings.
- Map each failed audit to a checklist item where one exists, so the user sees *what to do*, not just a number.
- A perfect Lighthouse SEO score does **not** mean the site will rank; it means the technical basics pass.
  Say that plainly rather than letting "100" imply success.

## Reporting
Present the numbers as separate, clearly-labelled blocks — never blended into one composite (see
`scorecard.md`). Each block states what it measures and, if it's missing, why:
```
Coverage (butler checklist):  42 → 95
Lighthouse (live, lab, mobile): SEO 100 · Perf 78 · A11y 94 · BP 92   [home, /pricing, /blog]
Real users (CrUX field):        no data yet — site is new / low traffic
Search Console:                 5 pages discovered · 1 indexed
```

## Persist
Write a `measurements` block to `state.json` (see `state-schema.md`): when it ran, which source
(`psi` / `local-lighthouse`), per-page scores, field metrics, and an explicit list of what could **not**
be measured and why. **Before overwriting the latest snapshot, push the old one onto `measurements.history`**
so movement over time is preserved (keep ~10, prune older).

## Show the trend (movement since last time)
When a prior snapshot exists in `state.json`, report the **delta vs the last comparable measurement** —
same page, same source/strategy — so the user sees progress, not just a static number:
```
Lighthouse (live, lab, mobile): Perf 78 (▲ +16 since 2026-07-15) · SEO 100 · A11y 94 (▲ +6) · BP 92
Real users (CrUX field):        LCP 2.1s (▼ from 2.8s) ✅ · INP 240ms ⚠️ · CLS 0.05 ✅
```
Honesty guards, all inherited from below:
- **Only compare like with like.** Never diff a lab score against a field score, or `psi` against
  `local-lighthouse`. If the only prior snapshot isn't comparable, show the number with no delta and say why.
- **Performance noise is not progress.** A few points of Lighthouse-performance movement between runs is
  noise — don't render it as ▲/▼. Only show a perf delta when it's large and repeatable, or a Core Web
  Vitals threshold was actually crossed.
- **First run shows no delta** — there's nothing to compare to yet. Say "baseline" rather than faking one.

## Honesty rules
- Never invent, estimate, or "approximate" a score. Missing is missing.
- Say which tool produced each number and when.
- If a whole layer was skipped (no network, no Chrome, rate-limited, site not public), state it in the
  report — a silent omission reads as a pass.
