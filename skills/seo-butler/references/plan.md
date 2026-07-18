# Plan Format — impact-ranked, agency-style

This is how the butler presents the plan in **step 3** (before applying anything). The scorecard
(`scorecard.md`) reports what happened *after*; this reference governs what you propose *before*.

A flat, unordered checklist reads like a chore list. An agency leads with the few things that move
the needle, then lists the rest. Same items, better framing — the user sees *what matters most* first
and can approve with confidence.

## The rule: rank by impact × effort

Every audited item that is `todo`/`partial` gets two quick tags:

- **Impact** — reuse the weight it carries in `scorecard.md` (that table already encodes real-world
  impact, aligned with `geo.md`'s honest tiers). Map the weight to **high / medium / low**:
  - weight ≥ 7 → **high** · weight 4–6 → **medium** · weight ≤ 3 → **low**
- **Effort** — your estimate of the work: **low** (a file or a few tags), **medium** (several pages),
  **high** (touches body copy across the site, or needs the user).

Order the plan by impact first, then by lowest effort within the same impact. This surfaces the
"big win, cheap to do" items at the very top — exactly what an expert would tackle first.

## Lead with the Top 3 wins

Before the full grouped list, show a **Top 3 wins** block: the three highest impact×effort items,
each with a one-line "why it matters" in plain language (no jargon). This is the part a non-expert
reads. If fewer than three items are outstanding, show what there is.

Never fabricate urgency. If the site is already in good shape, say so — "Only small things left" —
and keep the Top 3 honest (or fewer).

## The full plan still groups Code side vs Dashboard side

Below the Top 3, keep the existing grouping and the approve/edit/reject flow unchanged:
- **Code side** — the butler does these directly.
- **Dashboard side** — needs the user's logged-in browser (Search Console, GA4).
- **Optional (opt-in, heavy)** — strategy phase, local SEO module. Never selected by default.

Preserve the **body-copy boundary**: metadata is edited directly; substantive body-copy edits are
proposed here and applied only on approval (`safety.md`). Show an impact tag on each line so the
ordering is visible.

## Shape (translate to the user's language)

```
📋 SEO/GEO Butler — Plan
Project: <stack>, <N> pages detected · Run: <first run / re-run>

🎯 Top 3 wins (do these first — most impact for the effort)
  1. Add sitemap + robots.txt — so Google can find all <N> pages at all   [impact: high]
  2. Fix 3 pages with no meta description — better click-through from search [impact: high]
  3. Add JSON-LD — unlocks richer Google results & AI citations           [impact: high]

Code side (I'll do these directly), most impactful first:
  • [high] JSON-LD structured data (Organization + WebSite [+ per-page types])
  • [high] meta title + description — <N> pages missing
  • [med]  Open Graph + Twitter Card (+ generate OG image where missing)
  • [med]  internal linking — <N> orphans, <N> contextual links (body edits: on approval)
  • [low]  favicon / manifest / theme-color
  ...

Dashboard side (needs your logged-in Chrome — no passwords go to me):
  • [med] Google Search Console — add & verify site, submit sitemap
  • [low] Google Analytics (GA4) — set up + inject measurement tag

Optional (heavy, opt-in — skip to keep this run fast):
  🔍 Strategy — keyword research + competitor analysis
       (free/keyless by default; I'll ask once whether you want real search volumes)
  📍 Local SEO — LocalBusiness + NAP consistency (only if this is a local business)

[ Approve ]   [ Edit — e.g. "skip analytics" / "include strategy" ]   [ Reject ]
```

## Honesty rules (same spirit as the scorecard)
- Don't inflate impact to make the plan look important. The tags come from the scorecard weights, not
  from a desire to sell work.
- On a re-run with little left, a short honest plan ("Only 2 small things changed since last time") is
  the correct output — never manufacture items to fill the list.
- The Top 3 is about *impact for this site*, not a generic checklist — a site that already has schema
  shouldn't see "add schema" in its Top 3.
