# Reporting — did the work actually pay off?

The other commands answer three questions: *did I do the work* (score card), *did it ship*
(`/seo-live`), *did something break* (`/seo-watch`). This one answers the fourth: **is it working?**

`/seo-report` reads Google's own numbers, compares them with the snapshot taken when the work was
applied, and turns the difference into a **prioritized plan** the user can hand straight back to
`/seo`. That closes the loop:

```
/seo (set up) → deploy → /seo-live (verify) → ~4 weeks → /seo-report (measure + re-plan) → /seo → …
```

**The unfair advantage:** this plugin knows *what changed and when* (`state.json` → `items`, with
dates). Ahrefs can tell the user impressions rose; it has no idea they added JSON-LD on the 19th.
Aligning the changelog with the outcome data is the thing only this tool can do — and the thing most
easily turned into a lie, so read the causation rules below before writing a word of it.

## Cadence — why 28 days

- Search Console data lags **2–3 days**. Yesterday does not exist yet; never present it as zero.
- Indexing after a new sitemap takes days to weeks. Ranking after technical fixes typically settles
  over **2–8 weeks**.
- 28 days covers every weekday four times, which flattens the weekly cycle most sites have.

So: **first report ~4 weeks after the first `/seo` run, then monthly.** Weekly reporting on ranking
data is reporting noise — regression watching is `/seo-watch`'s job and belongs on a weekly cadence.

If less than 28 days of data exists on either side, **say so and stop**: *"Only 11 days since the work
landed — too early to read. Check back around <date>."* Never manufacture a trend from a short window.

## Getting the data — try in this order

1. **OpenSEO's Search Console connection** (`data-providers.md`) — read-only, **free, spends no
   credits**, API-based. Most robust, and works without a browser. Try this first whenever OpenSEO is
   connected, regardless of the user's `providerChoice` for keyword data.
2. **The user's signed-in Search Console in a browser** — Claude's in-Chrome tools if present, else the
   bundled Playwright's persistent profile. **Prefer the Performance page's CSV export button over
   scraping the UI**: the export is a stable contract, the SPA's DOM is not. Download, then read the file.
3. **Neither available** → record it as skipped **with the reason** and report only what you *can*
   measure (PSI/CrUX per `measurement.md`). "Couldn't check" is never "fine".

GA4 is optional and secondary here. Search Console answers "what does Google think of us"; GA4 answers
"what did visitors do once they arrived". Pull GA4 only if it's connected and the user asks about
behaviour — don't make a GSC report wait on it.

## What to pull

Per period (current 28 days, previous 28 days):
- **Site totals:** clicks, impressions, CTR, average position
- **Coverage:** pages discovered vs indexed, plus any indexing errors
- **Per query:** top queries by clicks and by impressions, with position
- **Per page:** top pages, and pages that lost the most

Where 12+ months of history exists, **also pull the same 28 days one year earlier.** Year-over-year is
the only comparison that controls for seasonality; use it whenever it's available.

## Reading the numbers honestly

This is where a reporting tool either earns trust or quietly becomes a liar. The rules are not optional.

**Noise floors — below these, say nothing rather than something:**
- **Query position:** ignore any query under **50 impressions** in the period. An "average position"
  over a handful of impressions is not a measurement.
- **Position movement:** report only changes of **≥3 positions** on queries above that floor.
- **CTR:** meaningless under **~200 impressions**. Don't rank pages by CTR below that.
- **Site totals:** report the percentage, but when absolute clicks are under ~100 for the period, label
  it explicitly as small-sample — a jump from 4 to 12 clicks is "+200%" and means almost nothing.
- **Indexed count:** a drop of 1 is noise; a drop of many is an emergency.

**Seasonality:** a 28-vs-28 comparison crossing a seasonal boundary can invert the real picture. When
year-over-year data exists, lead with it. When it doesn't, and the window spans an obvious boundary
(year-end, a major regional holiday period), **say the comparison is confounded** rather than
presenting the delta as clean.

**Correlation, never causation.** The butler knows what changed and when. It does **not** know why the
numbers moved.
- Write *"since the sitemap landed on 19 Jul"* or *"in the same period as"*.
- Never write *"because of"*, *"thanks to"*, *"driven by"*, or *"our JSON-LD caused"*.
- When reporting a large move, **name the confounders out loud**: other marketing the user ran, a
  Google update in the window, seasonality, a competitor's change. The user knows things the plugin
  doesn't — invite the correction.
- A **Google core update** inside the window changes everything and is publicly announced. If one
  landed, say so and treat every ranking delta in that window as unattributable.

**Don't take credit for what wasn't done.** Only align outcomes with items whose `state.json` date
actually precedes the movement. An item marked `partial` did not ship fully — say that.

## The output: a report, then a plan

Two sections. The report is what happened; the plan is what to do about it, ranked by impact, in the
shape `/seo` can consume directly.

```
📈 SEO Report — last 28 days vs previous 28 (work applied 19 Jul)
Data: Search Console via OpenSEO · through 2026-08-29 (GSC lags ~3 days)

Clicks           142 → 389      ▲ +174%
Impressions    4,210 → 11,830   ▲ +181%
CTR             3.4% → 3.3%     ≈ unchanged
Avg position     24.1 → 16.8    ▲ 7.3 places
Indexed             1 → 11

📅 Timeline (correlation, not proof)
  • Sitemap + robots.txt landed 19 Jul → indexing began 22 Jul
  • JSON-LD landed 19 Jul → first rich-result impressions 2 Aug
  ⚠️ You also launched on Product Hunt on 24 Jul — some of this is that, not SEO.

📉 Lost ground
  • /pricing — position 12 → 19 (1,240 impressions, above the noise floor)
    This page still has no meta description (item 4 is `partial`).

🟡 Still open from the last run
  • meta_description — partial, 2 pages
  • search_console — partial, 3 URLs reporting errors

📋 Recommended next run
  1. [high] Write meta descriptions for the 2 remaining pages — /pricing is losing position
             and sits at 1.9% CTR against a 3.3% site average
  2. [high] Fix the 3 URL errors in Search Console — they're excluded from indexing
  3. [med]  "seo audit tool" ranks #11 with 890 impressions — one position off page 1.
             Strengthen the targeting on /features.

Run /seo to apply these.
```

Rules for the plan section:
- **Every recommendation traces to a number in the report.** No generic SEO advice — if it can't be
  tied to an observed query, page, or open checklist item, it doesn't belong here.
- **Prefer near-miss opportunities:** queries ranking 8–15 with real impressions are the cheapest wins
  on the page, far cheaper than chasing something at #60.
- **Recommend; never apply.** This command changes nothing. Application goes through `/seo`'s plan and
  approval gate like everything else.

## What to write to state

Append the pulled snapshot to `measurements.searchConsole.history` (append-only, keep ~12 so
year-over-year stays possible), and set the top-level `searchConsole` fields to the latest. Record
`periodStart` / `periodEnd` / `source` on every snapshot — a comparison between two differently-sourced
or differently-windowed snapshots is invalid, and without those fields a later run cannot tell.

Record anything that couldn't be pulled in `measurements.unavailable`, with the reason.
