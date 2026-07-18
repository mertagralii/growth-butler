# SEO Score Card — report format

Shown at the end of every run, in the user's language. Goal: the user instantly sees what happened
and feels the work is complete — without needing SEO knowledge.

## Scoring (0–100) — computed, not estimated

**Never do this arithmetic by hand.** Run the script:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/score.mjs --state ./.seo-butler/state.json
node ${CLAUDE_PLUGIN_ROOT}/scripts/score.mjs --statuses '{"robots_txt":"done", ...}'   # before-score, pre-apply
```

Hand arithmetic across 35 weighted items is how the same site ends up with two different scores on
two runs. The script is the definition of the score; this section only explains it.

**Weights live in `${CLAUDE_PLUGIN_ROOT}/scripts/weights.json`** — that file is the single source of
truth. It groups the 35 checklist items into 23 weighted groups aligned with `geo.md`'s honest tiers:
structured data, AI crawlability and Core Web Vitals carry the most; `llms.txt` deliberately carries
almost nothing; the edge/CDN robots override carries 5 because when it bites it overrides everything
else. Read `weights.json` when you need the exact numbers — don't restate them here, or the two
copies will drift.

How it computes:

- `done` → full weight · `partial` → half · `todo`/`skipped` → zero, still in the denominator
- `n/a` → **removed from the denominator**, then the remainder renormalizes to 100
- The defined weights total **111, not 100** — deliberately. They are *relative*: adding a checklist
  item lowers every existing item's share slightly instead of inflating the total. Renormalization is
  what makes the score comparable across runs and across sites.
- Items present in `state.json` but absent from `weights.json` are reported as a warning rather than
  silently scoring nothing.

Compute a **before** (initial audit) and an **after** (post-apply) score.

## Report separate, labelled blocks — never one blended number

Four different questions, four answers. Blending them produces a number that means nothing:

| Block | Answers | Source |
|---|---|---|
| **Coverage** | "Did the butler do the work?" | the weighted checklist above |
| **Live verified** | "Is it actually deployed and intact?" | `/seo-live` (`live-verification.md`) |
| **Lighthouse (lab)** | "Is the page technically good?" | Google's auditor via PSI / local (`measurement.md`) |
| **Real users (CrUX field)** | "What do real visitors experience?" | Chrome UX Report — needs live traffic |
| **Search Console** | "What does Google actually think?" | the user's verified property |

After `/seo-live` has run, the header looks like:
```
Coverage (butler checklist):   38 → 95
Live verified:                 ✅ 2026-07-22
Lighthouse (live, lab, mobile): SEO 100 · Perf 78 (▲ +16 since 2026-07-15) · A11y 94 · BP 92   [home, /pricing, /blog]
Real users (CrUX field):        LCP 2.1s (▼ from 2.8s) ✅ · INP 240ms ⚠️ · CLS 0.05 ✅
Search Console:                 5 pages discovered · 1 indexed
```

**Show movement over time.** When `state.json` holds a prior comparable measurement (`measurements.history`)
or a prior `scoreHistory` entry, show the **delta since last run** next to the number — coverage already
does this within a run (before → after); the measurement blocks do it across runs. Follow `measurement.md`'s
trend rules: compare only like with like (same page, same source/strategy), never diff lab against field,
and don't render Lighthouse-performance noise as progress. First run has no delta — label it "baseline".

**Rules that keep this honest:**
- A high coverage score means the code is right — **not** that search engines see anything. Work that is
  applied but never deployed has zero effect.
- **Lab ≠ field.** Label which is which; never average them.
- Anything unmeasured shows the **reason**, not a guess: *"CrUX: no data yet — site is new / low traffic."*
- Lighthouse performance bounces between runs; don't report small deltas as progress or regression.
- Lighthouse SEO 100 means the technical basics pass, not that the site will rank. Say so.

> Honesty note: llms.txt is weighted low on purpose — as of 2026 no major AI engine officially
> consumes it. Don't let a high score imply AI-citation is guaranteed; the score reflects *setup
> quality*, not promised placement. Where possible, corroborate with real tools (Lighthouse, Rich
> Results / schema validators) rather than self-assessment.

## Report layout

```
🏁 SEO/GEO Butler — Score Card
Project: <stack> · <N> pages · <first run / re-run>

Coverage (butler checklist):   38 → 91   ▲ +53   ← what I did
Live verified:                 — (deploy, then run /seo-live)
Lighthouse (lab):              — (measured on the live site)
Real users (CrUX field):       — (measured on the live site)

✅ Done this run
  • Sitemap with 12 URLs + robots.txt
  • Meta title & description on 12 pages
  • JSON-LD: Organization, WebSite, 3× Article
  • Open Graph + Twitter cards
  • llms.txt + FAQ-ready structure (so ChatGPT/Perplexity can cite you)
  • Alt text on 8 images
  • GA4 measurement tag injected

🟡 Needs one small thing from you
  • Search Console: verification meta is in place — click "Verify" in the tab I opened
  • 2 pages had no body copy for a description — add a sentence and I'll finish them

💡 Content ideas to rank higher (GEO)
  • Home: add a one-line "What is X?" answer near the top — answer engines quote these
  • /pricing: add a short FAQ (3 Q&A) — strong for AI Overviews
  • /blog: add author + date to posts to unlock richer Article results

🔍 Strategy (only if the strategy phase ran — else: "Strategy: skipped (opt-in)")
  • Keyword clusters: <N> (by intent) → full map in .seo-butler/strategy.md
  • Top gaps vs competitors (auto-detected: competitorA.com — correct if wrong): <topic>, <topic>
  • Recommended topics (prioritized): <topic 1>, <topic 2>
  • Signals are qualitative (high/med/low) — keyless, no fabricated search volumes

📌 Notes
  • 1 render-blocking script found — moving it is optional, I left it to avoid breaking anything.

Memory updated → .seo-butler/state.json  ·  Next run only touches what changes.
```

## Tone
- Plain language, no jargon dumps. One line per item.
- Be honest in the 🟡 section — never mark dashboard steps "done" if the user still has a click to make.
- Always end by reminding them the state is saved, so re-running is safe and won't re-surprise them.
