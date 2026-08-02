---
description: Check the deployed site against outside auditors (Search Console, OpenSEO, geodaddy), then close the real gaps and re-verify until they agree
argument-hint: "[optional: site URL, or 'no-credits' to skip paid re-crawls]"
---

# SEO/GEO Butler — ground-truth verification

The butler has already done the work and scored it. This command asks **someone else** whether that
score is true, fixes what comes back, and keeps going until the outside sources agree.

The reason is concrete, not philosophical: on a real site the butler reported 98/100 and 35/35 items
while three pages carried a 404-ing link, five carried a dead contact link, and the homepage had a
skipped heading level in an item marked `done`. Self-verification cannot find the check it never
wrote. Outside crawlers can.

## First: load your brain

Invoke the **`seo-butler` skill**, then read
**`${CLAUDE_PLUGIN_ROOT}/skills/seo-butler/references/ground-truth.md`** — it holds the source table,
the measured false positives, the loop and its stopping rules. Also read `cdn-layer.md` (edge-side
findings), `safety.md` (what you may change without asking) and `plan.md` (the approval gate).

Where this file and the skill could disagree, the skill wins.

## Preconditions

- **The site must be deployed.** All three sources crawl the live URL; none can see uncommitted work.
  If nothing is deployed yet, say so and stop — don't crawl a stale deploy and report it as current.
- Take the URL from `state.json` → `deploy.liveUrl`, or from `$ARGUMENTS`.
- If `state.json` has no `groundTruth` block, run **first-run setup** (`ground-truth.md`) now and
  record it.

## The loop

Follow **the convergence loop in `ground-truth.md`** exactly. Yours to enforce as orchestrator:

**Collect in parallel.** Own validator, geodaddy, Lighthouse, OpenSEO, GSC. The free layers —
everything except a fresh OpenSEO crawl — run every time:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-artifacts.mjs --url <site> --pages /,<key pages> --json
```

Read OpenSEO's **existing** audit before paying for a new one — `get_audit_issues` is free,
`run_site_audit` is not. Only re-crawl when the last audit predates the work being verified, say the
credit cost before spending it, and skip it entirely if `$ARGUMENTS` says `no-credits`.

**Triage deterministically — don't eyeball the merge.** Save each report to a file and run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/triage-external.mjs \
  --openseo <file> --geodaddy <file> --lighthouse <lhr.json> --json
```

It collapses one dead URL reported eight ways into one job, suppresses the measured false positives
with their reasons, and flags what two sources independently agree on. **Work corroborated findings
first** — that is the strongest evidence available here.

**Close the gaps through the normal gate.** `act` findings become a plan the user approves, then get
applied and verified like any other work. An outside auditor's say-so does not authorise silent edits
and never authorises body-copy changes. `edge` findings go to the provider dashboard in the user's
own browser (`cdn-layer.md`) — never "fixed" in a repo that is already correct. `verify` findings get
proven or dismissed **in writing, with the evidence**.

**Re-check after deploy, then repeat.** Stop when `--fail-on-act` exits 0, when a round finds nothing
new, or after **three rounds** — whichever comes first. State which one ended it.

## Absolute rules

1. **Evidence, not obedience.** Every one of these tools has verified false positives. Acting on one
   damages a site that was already correct. Check `external-issues.json` before believing a finding.
2. **Report what the sources say, never that the site is perfect.** Clean sources mean these checks
   found nothing — not that nothing is wrong. Measured on a real site: **Lighthouse gave SEO
   100/100 while two other auditors found a 404-ing link and a skipped heading level on that same
   site.** One green score is evidence about one page, never about the site.
3. **A source you couldn't reach makes the round partial.** Name it. Never let silence read as a pass.
4. **Google's timing is not a defect.** GSC lags ~3 days and indexing takes longer; a page fixed
   today will not read as indexed today. Check the last-crawl timestamp before calling anything a
   regression.
5. **Reply in the user's language**, as everywhere else.

## Update state

Record in `state.json` → `groundTruth` (see `state-schema.md`): each source, when it last ran, what
it returned, rounds spent, findings closed, findings dismissed **with their reason**, and what is
still open and why. The next run reads this instead of re-deriving it — and the dismissals are how a
false positive stops costing time on every future run.

Close by telling the user plainly what changed, what only they can change (dashboard/CDN steps), and
what is waiting on Google's clock rather than on anyone's work.
