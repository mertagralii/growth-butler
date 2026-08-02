# Ground Truth — checking the work against sources that don't share the butler's blind spots

## Why this exists

The butler scores itself, deterministically, and two runs on an unchanged site agree. That is worth
having, and it is **not** the same as being right. Self-verification agrees with itself by
construction: it can prove the checks it runs are passing, and it can say nothing at all about the
check it never wrote.

That gap is not hypothetical. In the field the butler reported **98/100 and 35/35 items** on a site
that had, at that moment, a 404-ing internal link on three pages, a dead contact link on five more,
and a skipped heading level on the homepage — including in an item it had marked `done`. An outside
crawler found all of it in one pass. The root cause was structural: checklist item 13 existed on
paper but had no mechanical check behind it, so it quietly degraded into "the model reads the source
and it looks fine", and its page list came from the sitemap, which by definition excludes the
`noindex` pages where broken links accumulate.

So: **run the outside sources, every time work is applied.** Not because they are smarter, but
because they are wrong in *different places*.

## The three sources, and what each is actually authoritative for

| Source | Authoritative for | Cost | Needs |
|---|---|---|---|
| **Google Search Console** (via OpenSEO) | What Google *actually did* — is the page indexed, which canonical Google picked, real queries/impressions/positions | Free | One-time OAuth |
| **OpenSEO site audit** | Site-wide crawl: broken links, duplicate/missing metadata, redirect chains, orphan pages, thin content | `run_site_audit` spends credits; **reading results is free** | OAuth |
| **geodaddy** | GEO/AI-citation readiness: AI-bot access, schema stacking, listicle structure, semantic HTML, Core Web Vitals | Free, unlimited | Nothing — no key, no account |
| **Lighthouse** (chrome-devtools MCP) | Google's own page-level audit: SEO, accessibility and best-practices categories | Free, no quota, no key — runs locally | Chrome |

**On Lighthouse specifically.** It was already the performance layer (`measurement.md` Layer 2); what
was going unused is its **SEO / accessibility / best-practices** findings, which is what a user means
by "my Lighthouse SEO score". Feed the LHR into the triage like any other source. But note what it
is: **a single-page audit of things checkable in one page load.** It cannot follow links, so it
cannot see a broken one.

That limit is not theoretical. On the same site, in the same session:

> **Lighthouse SEO: 100/100.** OpenSEO: a 404-ing internal link on three pages. geodaddy: a skipped
> heading level. Both real, both confirmed by hand.

A perfect Lighthouse score is evidence about the page it audited, and about nothing else. This is the
whole argument for using more than one source — not that any of them is bad, but that each is blind
somewhere different.

**Nothing here replaces the butler's own validators.** `validate-artifacts.mjs` still runs first: it
is the only layer that works with no network, no account and no third party, and it is the one that
reads raw bytes. The outside sources are a second opinion on top of it, not a substitute for it.

### Which one answers which question
- *"Is this page indexed, and if not why?"* → **GSC URL Inspection** (`inspect_urls`). Nothing else
  can answer this. Not a crawler, not a validator, not a model. Google's own verdict or nothing.
- *"Did I break a link anywhere on the site?"* → **OpenSEO audit** or `validate-artifacts.mjs --url`.
- *"Would ChatGPT/Perplexity be able to cite this page?"* → **geodaddy** (`geo-*` checks).
- *"Is the work actually earning traffic?"* → **GSC performance** (`reporting.md` owns this).

## The rule that keeps this safe

> **An external finding is evidence, not a verdict.**

Every one of these tools produces false positives, and "closing" a false positive means damaging a
site that was already correct. Three measured examples, all reproduced on a real site on 2026-08-02:

- **OpenSEO** reports *missing meta description* on pages it has itself, in the same report, flagged
  as `noindex`. A meta description is never displayed for a page that isn't indexed. Not a defect.
- **geodaddy** reports *"JSON-LD block is missing required @type"* against
  `{"@context":…,"@graph":[{Organization},{WebSite}]}` — the canonical schema.org pattern, where
  every node does have `@type`. It only inspects the root object and doesn't traverse `@graph`.
- **geodaddy** reports *"No listicle format detected"* on ordinary prose, and wants
  `Article + ItemList + FAQPage` stacked on every page. `checklist.md` items 9 and 18 forbid exactly
  this: never force listicle structure onto prose, never add a schema type the visible content
  doesn't back.

These are encoded in `scripts/external-issues.json` so they can't be forgotten between runs. **Only
add an entry there after reproducing the disagreement** — an unverified suppression is how a real
defect gets dismissed forever.

## The convergence loop

This is the loop `/seo-verify` runs. It requires a **deployed** site: OpenSEO and geodaddy crawl the
live URL, so nothing here can be verified before a deploy.

**0 · Setup (first run only, then remembered).** Ensure the sources are reachable; record what is
connected in `state.json` → `groundTruth`. See "First-run setup" below. Never block the run on a
source that isn't connected — degrade and say which one is missing.

**1 · Collect.** Run, in parallel:
- `validate-artifacts.mjs --url <site> --pages <key pages>` (own layer, always)
- geodaddy `analyze_url` (free — no reason to skip it)
- Lighthouse via chrome-devtools MCP, saving the LHR JSON (free, local, no quota)
- OpenSEO `get_audit_issues` — read the **existing** audit first. Only spend credits on
  `run_site_audit` when the last audit predates the work you are verifying.
- GSC `inspect_urls` on pages whose indexability the work was meant to change

**2 · Triage.** Merge and adjudicate deterministically:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/triage-external.mjs \
  --openseo openseo-issues.json --geodaddy geodaddy-report.json --lighthouse lhr.json --json
```

It maps every finding onto the fixed checklist, collapses one dead URL reported eight ways into one
job, suppresses the measured false positives with their reason, and marks what **two independent
sources agree on** — corroboration is the strongest signal available here, so work those first.

Four verdicts come out: `act` (fix it), `edge` (real, but the fix is in the CDN dashboard —
`cdn-layer.md`), `verify` (prove it before touching anything), `informational` (not a defect).

**3 · Close the gaps.** `act` findings go through the **normal boundary, not around it**:
`plan.md` → user approval → apply → the usual build/typecheck/lint verification. An external
auditor's say-so does not authorise silent edits, and it especially does not authorise body-copy
changes (`safety.md`). `edge` findings are walked through the provider dashboard in the user's own
browser. `verify` findings get proven or dismissed **in writing**, with the evidence.

**4 · Re-check.** After the fix is deployed, re-run step 1 against the *same* sources and confirm the
finding is gone. A fix that isn't re-verified is a claim, not a result.

**5 · Repeat or stop.** Loop while new `act` findings keep appearing. Stop on any of:
- `triage-external.mjs --fail-on-act` exits 0 — no actionable findings remain;
- a round produces nothing new (the remaining items are `verify`/`edge`/`informational`);
- **three rounds**, or the user's credit budget, whichever comes first.

Then report **what the sources say**, not that the site is perfect:

> *"OpenSEO and geodaddy are clean as of <date>. 2 findings were dismissed as false positives
> (reasons below). 1 is a Cloudflare setting only you can change. GSC still shows /x as
> `Discovered – currently not indexed`, which is Google's schedule, not a defect."*

**Never claim convergence you didn't measure.** If a source was unreachable, that round is partial —
say so, and say which source.

## Honest limits of each source

- **GSC lags ~3 days** and indexing decisions take longer still. A page fixed today will not show as
  indexed today. `inspect_urls` reflects Google's *last crawl*, not the current HTML — check the
  crawl timestamp before treating it as a verdict on your fix.
- **OpenSEO's crawl is bounded** (`maxPages`, default 50) and honestly flags pages its crawler was
  blocked from. `fetchClass: "blocked"` means *unknown*, not *fine* — a WAF challenge is itself a
  finding (`cdn-layer.md`).
- **geodaddy analyses one URL** unless given `--max-pages`; its `tech-broken-links` warning on a
  single URL means "not checked", not "broken". Its `performance` category is `null` unless vitals
  are requested — a `null` is not a pass.
- **Lighthouse audits one page load.** It cannot follow a link, so it can never report a broken one,
  and a 100/100 SEO score says nothing about the rest of the site. Its `manual`, `notApplicable` and
  `informative` audits carry `score: null` — they were never judged, and counting them as failures
  invents work out of "not checked" (`triage-external.mjs` drops them).
- **All three crawl the deployed site.** They cannot see uncommitted work, and they cannot see a
  staging branch. If the numbers look wrong, check the deploy before checking the code.

## First-run setup

Do this once, during the first `/seo` run, and record it — a developer who has to configure four
services before getting value will never get value.

1. **geodaddy** — bundled MCP, nothing to configure. Verify it answers; if the `npx` fetch fails
   (offline, restricted network), note it and continue.
2. **OpenSEO** — bundled MCP. `whoami` confirms the connection and shows the credit balance;
   `list_projects` gives the `projectId` every other call needs. If no project matches the site,
   `create_project` it. The first call triggers an interactive OAuth flow, so it can't complete in an
   unattended run — that's expected, not an error.
3. **Search Console** — `seo-analytics` already owns verification + sitemap submission
   (checklist items 32–33). Connecting the property inside OpenSEO is what makes `inspect_urls` and
   `get_search_console_performance` work, and both are **free and spend no credits**.
4. **Record it** in `state.json` → `groundTruth`: which sources are connected, the `projectId`, the
   date, and for each one that isn't, the reason. The next run reads this instead of asking again.

**Ask about money once, not repeatedly.** Reading results is free across all three; only OpenSEO's
`run_site_audit` spends credits. Say the number before spending it, per `data-providers.md`.
