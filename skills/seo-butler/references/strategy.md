# Strategy Playbook — keyword research & competitor analysis (keyless)

This is the **optional strategy phase**. Unlike the fixed 35-item checklist (things the butler *applies*
to the code), strategy is **advisory**: it researches what the site should target and hands back a plan.
It runs only when the user approves the strategy line in the plan, because web research is slow and
token-heavy — don't run it on every pass.

Owner: the `seo-geo-content` specialist. Output: `./.seo-butler/strategy.md` + a summary in the score
card. Findings feed checklist item 24 (on-page keyword targeting) and item 21 (content suggestions).

## Step 0 — Let the user choose the data layer (once)

Before researching anything, read `state.json` → `strategy.providerChoice`.

- **Not set yet** → put the choice to the user now, using the exact framing in **`data-providers.md`
  → "Ask once, then remember"**: keyless (free, available immediately) vs OpenSEO (~$10/mo, real
  volume and difficulty). State the cost before they choose. Record the answer.
- **Already set** → honour it silently. Don't re-ask every run, and don't nag a keyless user.

Then confirm the chosen provider actually responds (see below). A chosen provider that fails falls
back to keyless **for this run**, with the reason said out loud.

## Two modes: keyless (default) or real-data (if a provider is connected)
First check whether a **data provider** is connected (see `data-providers.md` — OpenSEO by default, or
DataForSEO). This decides how Step 2 works:
- **Real-data mode** (provider connected): pull **real search volume, difficulty, competitor ranking
  keywords, and estimated traffic**. Label the source (`provider:openseo` / `provider:dataforseo`) and
  respect the cost discipline in `data-providers.md` (warn before spending, cache, stay scoped).
- **Keyless mode** (no provider — the default): you have **no paid data source**, so you can produce
  real keyword *ideas*, *intent*, and *structure* — but **not** reliable volume/difficulty numbers.

## The honesty rule (read first)
- **Keyless mode: never invent volumes** ("~12,000/mo"). Use a qualitative demand signal (**high /
  medium / low**) derived from how strongly a term surfaces across free signals, labeled as an estimate.
- **Real-data mode:** the numbers are the *provider's* (normal provider error) — label source + date;
  competitor **traffic is a model** (position × volume), not the competitor's real analytics — say so.
- Either mode: competitors are **auto-detected guesses** — present them as such and let the user correct
  them. Recommend topics; **never write the articles**. Never fabricate a number to fill a gap.

## Step 1 — Understand the site
From the actual content, determine the site's core topic, offering, and audience, and list its existing
pages/routes with the primary topic each one currently covers. You're mapping "what this site is about"
before deciding what it should rank for.

## Step 2 — Keyword research
**Real-data mode (provider connected):** query the provider (`data-providers.md`) for the seed terms →
real **volume, difficulty, CPC**, related/competitor keywords, and live SERP. Keep the intent
classification and clustering below; you're just replacing qualitative signals with real numbers (and
you can now rank by volume × difficulty). Warn on cost, cache, stay scoped to the plan.

**Keyless mode (default):** use `WebSearch` (and `WebFetch` when useful) to gather real demand signals — not guesses:
- **Autocomplete / "Searches related to"** — the phrasings people actually use around a seed term.
- **"People Also Ask" (PAA)** — real questions users type; excellent for informational intent and FAQs.
- **SERP inspection** — who ranks, and what sub-topics the top results cover.
Start from seed terms drawn from the site's topic (Step 1), expand each with these signals, and keep the
terms that genuinely match the site's offering. Cache what you find within the run — don't re-query per page.

Classify every kept keyword by **search intent** (this drives where it belongs):
- **Informational** — "how/what/why…" → blog/docs/FAQ content.
- **Commercial** — "best/vs/review/alternatives" → comparison/landing content.
- **Transactional** — "buy/price/signup/near me" → product/pricing/conversion pages.
- **Navigational** — brand/product-name queries → home/brand pages.

Attach a qualitative demand signal (high/medium/low) based on how consistently the term appears across
signals — clearly labeled as an estimate, never a fabricated number.

## Step 3 — Cluster & map to pages
Group the keywords into **topic clusters** (one clear intent per cluster). For each cluster:
- If an existing page already targets it → note the page (this feeds item 24: make that page own the term).
- If nothing targets it → mark it a **gap** and add a recommended new page/topic (feeds item 21; you
  recommend, you don't write it).
Flag **cannibalization**: two existing pages competing for the same cluster → recommend consolidating or
differentiating (also item 24).

## Step 4 — Competitor analysis
- **Identify competitors:** search the site's core topic/keywords and pick the few sites that repeatedly
  rank for the clusters. **Present them in the plan as auto-detected guesses; let the user correct/replace
  them** — they often know their real competitors better than a SERP does.
- **Analyze coverage:** for each competitor, note the topic areas and question types they cover well
  (from their nav, headings, and ranking pages).
- **Gap list:** produce the topics/intents competitors target that this site is missing or weak on,
  prioritized by relevance to the site's offering. These become recommended topics.

## Step 5 — Write `./.seo-butler/strategy.md`
Deterministic, human-readable. Suggested structure:
```
# SEO Strategy — <site>  (<date>)

## Keyword clusters (by intent)
### Informational
- <cluster name> — signal: medium — target: /existing-page  |  GAP → recommend /new-topic
  - keywords: term a, term b, term c
### Commercial / Transactional / Navigational
- …

## Intent → page map
- /page — primary target: "<term>"  (cannibalization: competes with /other → differentiate)

## Competitor gaps (auto-detected: competitorA.com, competitorB.com — correct if wrong)
- <topic they cover, you don't> — priority: high — recommend: /new-topic

## Recommended topics (prioritized — recommendations, not written content)
1. <topic> — why it matters — intent — suggested page
```

## Step 6 — Hand off to the applied work
- Feed **item 24**: which primary term each existing page should own; which cannibalizations to fix.
- Feed **item 21**: the recommended new topics become content suggestions in the score card.
- Any actual on-page edits still go through the plan and the body-copy approval boundary (see `safety.md`).
- Record a compact summary in `state.json`'s `strategy` block (see `state-schema.md`) so a later run can
  refresh rather than redo the research.

## What NOT to do
- Don't fabricate search volumes, difficulty scores, or traffic estimates.
- Don't assert competitors as fact — they're guesses the user can correct.
- Don't write articles or rewrite pages here — strategy recommends; application happens through the
  normal plan + approval flow.
- Don't run this phase unprompted — it's opt-in because it's heavy.
