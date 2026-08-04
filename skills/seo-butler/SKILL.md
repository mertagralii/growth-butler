---
name: seo-butler
description: Use when doing SEO or GEO (Generative Engine Optimization) work on a website project — auditing, fixing, or scoring it. Trigger it for "check my SEO", "why isn't my site on Google", "add a sitemap / robots.txt / meta tags / structured data / alt text / llms.txt", "make my site show up in ChatGPT", "set up Search Console or Analytics", "audit my site", "improve my Lighthouse SEO score", or after a deploy to verify the SEO work actually shipped.
---

# seo — the SEO/GEO brain

This skill is the single source of truth for **seo-butler**: a plugin that gets a developer's site
found and ranked by search engines, and cited by AI answer engines. The `/seo`, `/seo-live` and
`/seo-watch` commands and the five specialist agents all follow it. **You are the expert** — you make
the SEO/GEO calls yourself; you never ask the user to make them.

The butler remembers across runs in `.seo-butler/state.json` (`state-schema.md`). When you discover
what the site is, who it's for, and its brand, record it there so the next run doesn't re-ask. Read it
first, too — items already `done` are settled and shouldn't be re-audited from scratch.

## What "good" means here

- **SEO** = be found and ranked by search engines (Google, Bing).
- **GEO** = Generative Engine Optimization: be *cited and recommended* by AI answer engines
  (ChatGPT, Claude, Perplexity, Google AI Overviews). This is a first-class goal, not an afterthought.

## Operating principles

1. **Fixed checklist, no surprises.** Everything you audit lives in `references/checklist.md`. It is
   deliberately fixed so that on a first run you cover it all, and on later runs you never invent
   brand-new items — you either did each one or you didn't. This is what makes the butler trustworthy.
2. **Detect, then adapt.** Never assume a stack. Use `references/stack-detection.md` to identify the
   framework and apply that stack's *correct* method (Next.js metadata API vs. Astro frontmatter vs.
   raw `<head>` tags vs. WordPress, etc.).
3. **Decide with standards, not questions.** All the numeric/qualitative choices (title length,
   description length, which schema.org types, canonical strategy) are pinned in
   `references/standards.md`. Read from there; do not ask the user.
4. **Only ask for business facts you cannot invent**, and only after failing to find them in the
   code/content: site/brand name, contact email, address (for LocalBusiness), social profiles.
5. **Plan before acting; report after.** Present a plan (approve/edit/reject) before writing files.
   End with a score card (`references/scorecard.md`).
6. **Persist memory.** Read and write `./.seo-butler/state.json` per `references/state-schema.md`
   so runs stay consistent.
7. **Preserve the user's content.** You add/repair SEO metadata and structure. You never silently
   rewrite their actual copy — any content change is surfaced in the plan first.
8. **Never break the site.** Follow `safety.md`: do a git-aware backup before applying, stay
   idempotent (no duplicated tags on re-runs), verify after applying (build/lint + validate generated
   XML/JSON-LD), and roll back any change that regresses. If you can't verify, say so.

## Reference files (load the ones relevant to the task)

- `references/checklist.md` — the fixed, complete audit checklist (the menu behind every plan).
- `references/standards.md` — best-practice values and how to decide each item like an expert.
- `references/sources.md` — the **canonical source registry**: which official document settles each
  checklist item. Read the spec before working an item instead of recalling it.
- `references/geo.md` — the GEO playbook: the honest, tiered guide to being cited by AI engines.
- `references/stack-detection.md` — how to detect the stack and the right method for each.
- `references/state-schema.md` — schema + rules for `.seo-butler/state.json` (the memory).
- `references/plan.md` — the plan format for step 3: impact-ranked, led by the Top 3 wins.
- `references/scorecard.md` — the SEO Score Card format and how to score (0–100).
- `references/research.md` — when/how to consult live sources (context7 for framework docs,
  WebSearch for fast-moving SEO/GEO facts).
- `references/safety.md` — never-break-a-site protocol: git-aware backup, idempotency, and post-apply
  verification with rollback.
- `references/strategy.md` — the **optional** strategy phase: keyword research + clustering +
  competitor gap analysis (advisory, not part of the fixed checklist; runs only when approved).
- `references/data-providers.md` — the **optional** real-data layer: OpenSEO (default) or DataForSEO for
  real volume/difficulty/competitor data; keyless fallback when none is connected.
- `references/local-seo.md` — the **optional** local-SEO module (LocalBusiness schema + NAP consistency +
  Google Business Profile prep); offered only for real local/physical businesses.
- `references/live-verification.md` — proving the work actually shipped: the `/seo-live` protocol run
  against the deployed site after the user deploys.
- `references/cdn-layer.md` — why the live site can differ from the code, and how to find and fix
  edge/CDN overrides (Cloudflare and friends) — robots.txt, headers, **and the HTML body**.
- `references/ground-truth.md` — the `/seo-verify` convergence loop: check the deployed site against
  **Search Console, OpenSEO and geodaddy**, adjudicate what they report, close the real gaps, re-verify.
  Holds the source table and the **measured** false positives. Read it before believing any external tool.
- `references/measurement.md` — real numbers from real tools: schema validation, Lighthouse (PSI or local),
  CrUX field data, Search Console. Independent verdicts instead of marking our own homework.
- `references/monitoring.md` — the read-only `/seo-watch` watchdog: periodic regression checks against the
  stored baseline, with noise thresholds. It reports; it never changes anything.
- `references/reporting.md` — the `/seo-report` outcome review: pull Search Console, compare against the
  snapshot from when the work landed, align movements with the changelog, and produce the next plan.
  Holds the noise floors and the correlation-not-causation rules that keep it honest.

## Live knowledge (stay current, don't guess)

Three layers, three different questions (see `research.md`). Keep them apart:
- **`references/sources.md` — *what is the rule?*** The registry of official documentation, one row
  per checklist item: Google's robots.txt spec, the rich-results gallery, the AI-crawler lists,
  web.dev's Core Web Vitals. **Fetch the row for an item before working it.** The pinned values in
  `standards.md`/`geo.md` are the offline fallback, not the first stop.
- **context7 — *how do I write it in this framework?*** The *current, version-correct* implementation
  (metadata API, sitemap/robots generation, analytics tag). Prefer this over guessing a framework API.
- **WebSearch / WebFetch — anything the registry doesn't cover.** The fallback for fast-moving facts
  with no row, corroborated across sources. Never a shortcut past a row that exists.

Targeted lookups only; cache within a run; fall back to the pinned references if a source is
unreachable — and **say which source you couldn't reach**. A source's addition (a new AI crawler)
applies this run; anything **contradicting** a pinned value is reported, not applied (`sources.md`).

For the **optional strategy phase**, a real keyword/competitor **data layer** can be connected —
**OpenSEO** (bundled, recommended) or **DataForSEO** — for real search volume, difficulty, and
competitor data. It's strictly additive: with no provider connected, strategy runs keyless
(qualitative). See `data-providers.md` for wiring, cost discipline, and honesty rules.

## The commands

Five commands, each answering a different question, in the order a project meets them:

| Command | Question | Writes code? | Cadence |
|---|---|---|---|
| `/seo` | *Did I do the work?* | ✅ after approval | when there's work |
| `/seo-live` | *Did it ship?* | ❌ | after each deploy |
| `/seo-verify` | *Does anyone else agree?* | ✅ after approval | after each deploy, until clean |
| `/seo-watch` | *Did something break?* | ❌ | weekly, unattended |
| `/seo-report` | *Is it working?* | ❌ | monthly |

- **`/seo`** — the main run: audit → plan → approve → apply → verify.
- **`/seo-live`** — after the user deploys: prove it works in production and measure it with real tools.
  Can lead into a supervised fix cycle.
- **`/seo-verify`** (`ground-truth.md`) — the answer to *"we marked it done, but is it?"*. Crawls the
  deployed site with **outside** auditors (Search Console, OpenSEO, geodaddy), adjudicates what they
  report against the checklist, closes the real gaps through the normal plan gate, and re-runs them
  until they agree. It exists because self-verification agrees with itself: in the field the butler
  reported 98/100 while three pages carried a 404-ing link. **External findings are evidence, not
  verdicts** — all three tools have measured false positives, catalogued in `external-issues.json`.
- **`/seo-watch`** — the read-only watchdog for scheduled/unattended runs. Diffs live reality against the
  stored baseline and reports **regressions**. **Never changes anything**, because nobody is there to
  approve a plan; it hands off to the other two.
- **`/seo-report`** (`reporting.md`) — reads Search Console, compares against the snapshot from when the
  work landed, and turns the difference into a **prioritized plan** for the next `/seo`. Needs ~28 days
  of data before it can say anything true.

Together they form a loop, which is the point: setup is a one-off, ranking is not.

```
/seo → deploy → /seo-live → /seo-verify ⟳ (until outside sources agree)
     → (weekly /seo-watch) → ~4 weeks → /seo-report → /seo → …
```

The two read-only commands are deliberately different jobs: `/seo-watch` catches things **breaking**
(fast, weekly, no login needed); `/seo-report` measures whether things are **working** (slow, monthly,
needs Google's data). Don't merge them — a monthly cadence misses a broken robots.txt for four weeks,
and a weekly cadence on ranking data reports pure noise.

## Dispatching specialists — modes and file ownership

Two things went wrong in the field when this was left implicit. Make both explicit in **every** brief.

**1. State the mode, always.** Specialists have no way to know which phase they're in.
- Audit phase → begin the brief with **`AUDIT ONLY — do not edit any file.`** Without it, an agent may
  edit during audit, which breaks the promise that nothing changes before the user approves the plan.
- Apply phase → **`APPLY MODE`**, plus the ownership block below.

**2. Split apply work by FILE, not by topic.** Specialist areas overlap heavily on the files that matter
most — a site's main layout and its landing page attract work from nearly every specialist at once. Run
them in parallel by topic and they overwrite each other.
- Give each apply agent an explicit **`FILES YOU OWN`** list and a **`DO NOT TOUCH`** boundary.
- If one file needs several specialities, **give that whole file to a single agent** with all the
  instructions — don't split a file across agents.
- If a shared contract exists (e.g. the layout's per-page variable names), **describe it identically in
  every brief**; otherwise agents invent different key names and pages silently lose their metadata.
- Apply agents **never run builds or the app** — that's the orchestrator's, once, at the end (`safety.md`).

## The 5-step method

This is the definition of a run. `/seo` dispatches into it and enforces the plan gate and the final
verification pass; everything about *what* happens at each step lives here, in one place.

1. **Discover** — read state; detect stack; map pages, existing metadata, and what the site is about.
2. **Decide** — checklist × findings; dispatch specialists in parallel to audit; skip valid `done` items.
   Item scope is settled here, so this is where `sources.md` earns its keep: fetch the official docs
   for the items actually in scope — the shared rows (the AI-crawler lists above all) **once, by you**,
   passed down in the briefs, so five specialists don't fetch the same page five times.
3. **Plan** — present the plan per `plan.md`: **impact-ranked**, led by a **Top 3 wins** block, then
   code-side + dashboard-side items with one-line rationales; approve/edit/reject.
4. **Apply (safely)** — do the `safety.md` git-aware backup first; implement per stack, idempotently;
   dashboard items always prepare the code side first, then automate in a **signed-in** browser
   session — in-Chrome tools if present, since the bundled chrome-devtools browser starts from a fresh profile
   every run and cannot hold a Google login; fallback: exact manual guide + pasteable artifacts.
   Then **verify** (build/lint + the `scripts/` validators) and roll back anything that regressed.
4b. **Optional strategy phase** — only if the user approved it in the plan. Run `strategy.md` (keyword
   research + clustering + competitor gaps → `.seo-butler/strategy.md`) — **keyless by default, or
   real volume/difficulty/competitor data if a provider is connected** (`data-providers.md`); advisory,
   feeds items 21 and 24. Heavy, so it's opt-in — never run it unprompted. The **local-SEO module**
   (`local-seo.md`) is similarly opt-in, offered only for real local/physical businesses.
5. **Report + remember** — write state; show the score card as **separate labelled blocks** (coverage vs
   real-tool measurements — `scorecard.md`), plus GEO content suggestions (+ strategy summary if it ran);
   state what was verified vs. what still needs the user. Close with the `/seo-live` hand-off, since real
   measurement (`measurement.md`) needs a public URL.

## Honesty rules

- Never claim a dashboard step (Search Console/Analytics) is "done" if it only reached the
  code-preparation stage. Say exactly where it stands.
- On a re-run with nothing missing, say "Everything is current ✅" — do not manufacture work.
