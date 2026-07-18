---
description: Read Google Search Console, compare against the snapshot from when the SEO work was applied, and turn the difference into a prioritized plan
argument-hint: "[optional: period, e.g. '90 days' — defaults to the last 28 days vs the previous 28]"
---

# SEO Report — is it working?

The user set the site up with `/seo` and deployed it. Time has passed. This command answers the one
question the other commands don't: **did it pay off?**

It reads Google's own numbers, compares them with the snapshot stored when the work landed, and hands
back a **plan** for the next `/seo` run. Reply in the user's language.

## Load your context

Read **`${CLAUDE_PLUGIN_ROOT}/skills/seo-butler/references/reporting.md`** and follow it end to end. You'll
also want `measurement.md` (PSI/CrUX layer, trend rules) and `data-providers.md` (the OpenSEO Search
Console connection, which is free and spends no credits).

Read `./.seo-butler/state.json` first. It is the baseline **and** the changelog — which items were
applied, and on what date. Without it there's nothing to compare against: say so and tell the user to
run `/seo` first rather than inventing a baseline.

## This command never changes the user's code

It reads, compares, and recommends. The only file it writes is `state.json` (appending this
measurement to history). Every actual change goes through `/seo`'s plan and approval gate — no
exceptions, no "while I'm here" fixes.

## The run

1. **Check there's enough data.** Under 28 days since the work landed → say it's too early, give the
   date to come back, and stop. Don't manufacture a trend from a short window.
2. **Pull the data** using the ladder in `reporting.md`: OpenSEO's Search Console connection first,
   then the user's signed-in Search Console in a browser (prefer the Performance page's **CSV export**
   over scraping the SPA), then honestly skip. Whatever you couldn't get is recorded with its reason.
3. **Compare** — current 28 days vs the previous 28, plus year-over-year where 12+ months exist.
   Apply the noise floors in `reporting.md` strictly: a query under 50 impressions has no meaningful
   position, and a jump from 4 clicks to 12 is not "+200% growth".
4. **Align with the changelog** — line up movements with the dates in `state.json`. This is the part no
   other SEO tool can do, and the part easiest to turn into a lie: write *"since X landed"*, never
   *"because of X"*. Name the confounders you can see — other marketing, seasonality, a Google core
   update in the window.
5. **Write the plan** — every recommendation traceable to a number in the report. Favour near-miss
   queries (ranking 8–15 with real impressions) and open `partial`/`todo` items that the data shows
   are costing something. No generic SEO advice.
6. **Update state** — append the snapshot to `measurements.searchConsole.history` with
   `periodStart`/`periodEnd`/`source`, refresh the top-level fields, and end by pointing at `/seo`.

## Notes

- `$ARGUMENTS` may name a different period ("90 days", "since June"). Honour it, but keep both sides of
  the comparison the same length and say which windows you used.
- **GSC lags 2–3 days.** The last few days are incomplete, not zero — never plot them as a crash.
- If the numbers went down, say so plainly and look for the cause in the data. A reporting tool that
  only reports good news is worthless.
