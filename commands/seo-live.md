---
description: Verify the deployed site — fetch the live URL and prove the SEO/GEO work actually shipped and works
argument-hint: "[optional: live URL, if it isn't already in state]"
---

# SEO Butler — Live Verification

The user has deployed. Your job is to **prove the work is real in production** — not in the repo.

Applying changes is only half the job: template engines mangle output, CDNs shadow robots.txt, link
generation emits non-canonical URLs, deploys land half-finished. None of that is visible in the source.

## Load your protocol
Read **`${CLAUDE_PLUGIN_ROOT}/skills/seo-butler/references/live-verification.md`** and follow it end to
end, plus **`measurement.md`** (real-tool scoring: Lighthouse/PSI, CrUX, schema validation). You'll also
want `cdn-layer.md` (edge overrides), `standards.md` (thresholds), `state-schema.md` (where to record
results), and `scorecard.md` (how to report). The `seo-butler` skill has the full picture.

**You own this verification yourself** — don't farm it out to the apply specialists. Verification is
centralized in the orchestrator (see `safety.md`).

## The flow

1. **Establish the live URL and deploy state.** Take the URL from `state.json` (`project.siteUrl`) or
   `$ARGUMENTS`; ask only if genuinely unknown. Then confirm the changes are actually live by looking for
   a marker of your work. **If they're not there, say the deploy doesn't appear to be live yet and stop —
   do not report the site as broken.** False alarms cost more trust than missed issues.

2. **Run the three layers** from `live-verification.md`:
   - **HTTP/artifacts** — live `robots.txt` **compared against what the code produces** (this is how you
     catch a CDN shadowing it), sitemap validity + no BOM, llms.txt / OG image / favicons / manifest,
     status codes and real 301s.
   - **Rendered HTML** — JSON-LD present as literal `application/ld+json` in the raw response *and*
     parsing as valid JSON; canonical values; internal links pointing at the canonical variant;
     `<meta name="robots">` on the right pages; unique titles/descriptions.
   - **Browser (chrome-devtools)** — JS-rendered content visible, analytics request actually firing, load
     behavior and console errors, screenshot for the record.

3. **Measure with real tools** — follow `measurement.md`. Now that a public URL exists, get independent
   verdicts instead of self-assessment:
   - **Always:** deterministic validation (parse every JSON-LD block and check schema.org required fields;
     sitemap XML; robots).
   - **Lighthouse via the PageSpeed Insights API** — one call returns both the lab scores *and* CrUX field
     data, no local browser needed. Mobile strategy first. Home page + 2–3 pages that matter.
   - **Opportunistic:** CrUX real-user metrics (same response) and Search Console's own view via the
     logged-in browser.
   Anything you can't measure is reported as unavailable **with the reason** — never estimated.

4. **Report findings in two buckets**, because they're fixed in different places:
   - **Code-side** → offer the normal butler flow: plan → approval → apply. When done, tell the user:
     *"Deploy again, then call me back with `/seo-live`."*
   - **Panel / CDN-side** → not in the repo. Walk them through their provider's dashboard in their own
     logged-in browser (`cdn-layer.md`), then **re-fetch to confirm it took effect**.

5. **Update state and report.** Write the `deploy` and `measurements` blocks in `.seo-butler/state.json`,
   then show the score card as **separate, labelled blocks** (`scorecard.md`): butler coverage, Lighthouse
   (lab), CrUX (real users), Search Console. Never blend them into one number — they answer different
   questions, and a high coverage score is not evidence the site is fast or indexed.

6. **Set the follow-up expectation.** Verified-live is not the same as working. Close with the honest
   timeline: Google needs days to weeks to re-crawl and settle, so tell the user to run **`/seo-report`
   in about four weeks** to see what actually moved — and, if they want breakage caught sooner, to
   schedule `/seo-watch` weekly (`monitoring.md`).

## Rules
- Reply in the user's language.
- **The loop stays open until live is clean.** Don't declare success with findings outstanding.
- If the site is unreachable, or chrome-devtools isn't available, say exactly what you could and couldn't
  check. Never infer a pass.
- Nothing in the repo is evidence here. Only what you fetched counts.
