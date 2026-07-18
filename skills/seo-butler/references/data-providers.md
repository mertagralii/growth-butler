# Real Keyword & Competitor Data — the optional data layer

The strategy phase (`strategy.md`) is **keyless by default**: it derives *qualitative* demand signals
(high/med/low) from free web signals. This reference adds an **optional real-data layer** — actual
search volume, keyword difficulty, competitor ranking keywords, and estimated traffic — when the user
connects a data provider. It is **strictly additive**: with no provider, everything falls back to the
keyless behavior, unchanged.

The layer is **provider-agnostic**. The strategy logic (clustering, intent, cannibalization, gap
analysis) is identical regardless of provider — only the *inputs* get better. Today two providers are
documented; a third could be added without touching `strategy.md`.

## Ask once, then remember (the first-time choice)

The user should **decide this knowingly**, not discover it afterwards. The moment they approve the
strategy line and `state.json` has no `strategy.providerChoice` yet, stop and put the choice to them
— once, in plain language, with the cost stated up front:

> **Before I research: do you want real numbers?**
>
> **A · Keyless (free, right now)** — I'll find the keywords worth targeting, sort them by intent,
> cluster them, spot pages competing with each other, and list what competitors cover that you don't.
> What I *can't* give you is how many people actually search each term, or how hard it is to rank.
>
> **B · Connect OpenSEO (~$10/mo, free tier available)** — everything above, plus real monthly search
> volume, keyword difficulty, and your competitors' ranking keywords. One-time browser sign-in; no API
> key is stored anywhere. Free Search Console connection included.
>
> You can start keyless and connect later — a re-run refreshes the numbers without redoing the research.

Rules for this prompt:
- **Ask at approval time, not at install time**, and not on every run. Once answered, record it and
  move on.
- **Never pressure.** Keyless is a legitimate answer, not a degraded one — say what it *does* give,
  not only what it lacks.
- **State the money before they choose**, never after.
- If they pick B and the OAuth flow doesn't complete, say so and **fall back to keyless for this run**
  rather than failing. Leave `providerChoice` unset so they're asked again next time.
- Record the answer in `state.json` → `strategy.providerChoice` (`"keyless"` | `"openseo"` |
  `"dataforseo"`). Re-ask only if the user asks to change it, or if a chosen provider stops working.

## Detecting whether a provider is connected
1. **OpenSEO** (default): its tools appear in the session (bundled MCP — see below). A tool call that
   returns data means connected; if the first call triggers an auth/login prompt that isn't completed,
   treat it as **not connected** and fall back to keyless.
2. **DataForSEO** (alternative): connected only if the user configured its MCP with credentials.
3. **Neither:** run keyless (`strategy.md` as-is). Never block the run waiting for a provider.

Say plainly in the plan which mode you're in: *"Strategy: real data via OpenSEO"* vs *"Strategy:
keyless (qualitative signals — connect OpenSEO for real volumes)."*

## Provider A — OpenSEO (recommended default)
Open-source (`every-app/open-seo`, MIT) SEO data layer built on top of DataForSEO, with a hosted MCP.
Best fit for the butler's user (a developer who doesn't want to run raw data pipelines): low setup
friction, predictable cost, no secrets in config, and a free Search Console connection.

- **Wiring:** bundled in the plugin's `.mcp.json` as an HTTP MCP at `https://app.openseo.so/mcp`. The
  **first tool call sends the user through an OpenSEO login/OAuth flow**; after they authorize, the
  tools work with their project context. No API key lives in the repo or env.
- **Tools (grouped):** Keywords (volume, difficulty, CPC, live SERP, saved keywords, rank tracker);
  Competitive research (domain overview, ranking keywords, backlink stats); Search Console (performance
  + URL inspection — **read-only, no credits**).
- **Cost:** hosted from ~$10/mo, or self-host (Docker) with the user's own DataForSEO key. A free tier
  and free GSC exist — the user can try it before spending.
- **Caveat:** the OAuth flow is **interactive**, so it won't complete in a fully unattended run (e.g.
  `/seo-watch`). That's fine — the strategy phase is opt-in and interactive anyway.

## Provider B — DataForSEO (documented alternative)
The official, established raw-data provider (the "gold standard" OpenSEO itself runs on). For a
power user who already has an account, or who wants a fully headless (stdio) setup.

- **Wiring:** the official MCP, added like the bundled n8n MCP — stdio via `npx dataforseo-mcp-server@latest`,
  with credentials in env:
  ```json
  "dataforseo": {
    "command": "npx",
    "args": ["dataforseo-mcp-server@latest"],
    "env": {
      "DATAFORSEO_USERNAME": "${DATAFORSEO_USERNAME}",
      "DATAFORSEO_PASSWORD": "${DATAFORSEO_PASSWORD}",
      "ENABLED_MODULES": "KEYWORDS_DATA,DATAFORSEO_LABS,SERP"
    }
  }
  ```
- **Keep the module surface narrow:** `KEYWORDS_DATA` (volume) + `DATAFORSEO_LABS` (difficulty,
  competitor/related keywords) + `SERP` cover the strategy phase. More modules = more tools and more
  ways to spend — don't enable `BACKLINKS`/`ONPAGE`/etc. unless the user asks.
- **Cost:** pay-as-you-go, minimum ~$50 credit purchase; every call costs. Credentials are the user's
  secret — **never print, log, or commit them** (env only).

## What the data layer answers (the user's real questions)
With a provider connected, the strategy phase can answer these concretely instead of qualitatively:
- **"Which keywords can I realistically compete on?"** → real **volume × difficulty**. Favor
  meaningful volume + low/medium difficulty relative to the site's authority.
- **"Which keywords send competitors more traffic than me?"** → the competitor domain's ranking
  keywords and **estimated** traffic where the site ranks poorly or not at all.
- **"What do I do to overtake them?"** → the prioritized gap list + per-page actions (which existing
  page to strengthen for which term, which new content to create). Application still flows through the
  normal plan + body-copy approval boundary (`safety.md`).

## Cost & spend discipline
- **Warn before spending.** Before running paid queries, say roughly how many calls / what it costs,
  and get the go-ahead — especially on DataForSEO's per-call model.
- **Cache within the run.** Look up a term/domain once; reuse it. Never re-query per page.
- **Scope to the plan.** Query the seed terms and the few real competitors — not the whole keyword
  universe. Strategy is opt-in and bounded, not an open-ended crawl.

## Honesty rules (inherited and extended)
- **Estimates are estimates.** Competitor "traffic" is modeled from position × volume, **not** the
  competitor's real analytics. Present it as an estimate, never as fact.
- **Volumes are the provider's numbers**, with normal provider error — label the source
  (`provider:openseo` / `provider:dataforseo`) and the date.
- **Never fabricate a number.** If a provider call fails or isn't connected, say so and use the keyless
  qualitative signal — never invent a volume to fill the gap.
- Record the source in `state.json`'s `strategy` block (`source`) so a later run refreshes rather than
  re-paying.
