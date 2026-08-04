# Live Knowledge — when and how specialists consult external sources

The butler has three live-knowledge layers so specialists can stay current instead of relying on
stale training data. Use them deliberately — targeted lookups, not open-ended browsing. (The plugin also
bundles other MCPs — chrome-devtools for rendering, Lighthouse and performance tracing, and the optional OpenSEO data layer — covered elsewhere.)

## Three layers, three jobs

They answer different questions and are not interchangeable. Picking the wrong one is how a run ends
up implementing a blog post's opinion with a deprecated framework API.

| Question | Layer |
|---|---|
| *What is the rule?* | **`sources.md`** — the official spec |
| *How do I write it in this stack?* | **context7** |
| *Fast-moving, no row in the registry* | **WebSearch / WebFetch** |

### 1. `references/sources.md` — the canonical source registry (read this first)
One row per checklist item, pointing at the document that actually settles it: Google's robots.txt
specification, the rich-results gallery, the AI-crawler lists from OpenAI/Anthropic/Perplexity/Google,
web.dev's Core Web Vitals. **Before working an item, fetch its row and work from what the document says
now.** `standards.md` and `geo.md` remain the offline fallback and the tie-breaker — not the first stop.

Two rules travel with it: an **addition** the source makes (a newly announced AI crawler) applies this
run; anything that **contradicts** a pinned value is reported with both values and the URL, never
silently applied. Full reasoning in `sources.md`.

### 2. context7 (bundled MCP) — framework & library specifics
Use for **"how do I do X correctly in this exact framework/version?"** SEO methods change between
framework versions (e.g. Next.js Metadata API, `app/sitemap.ts`, Astro's `@astrojs/sitemap`, Nuxt
`useSeoMeta`). Before implementing stack-specific code whose API you're not 100% sure is current:
- Resolve the library id, then query its docs for the precise, current mechanism.
- Prefer this over guessing. Wrong-version code is the #1 way the butler could break a site.
- Typical triggers: metadata/head API, sitemap/robots generation, i18n/hreflang config, image
  optimization component, script-loading helper for the analytics tag.

### 3. WebSearch / WebFetch — what the registry doesn't cover
Use for **"what's the current best practice right now?"** when `sources.md` has no row for it. Use when:
- Something fast-moving materially affects the work and no official document settles it.
- Competitor / keyword research in **keyless** mode (the strategy phase's free-signal path). When a
  real data provider is connected instead, use it rather than WebSearch — see `data-providers.md`.

**Don't use it to answer a question the registry already answers.** The current AI-citation-bot list
and a schema.org type's required fields both have rows in `sources.md`; a blog summarising Google's
documentation is strictly worse than Google's documentation, and it is usually the stale copy.

## Discipline (don't waste tokens or trust blindly)
- **Targeted, not exploratory.** One or two precise lookups for a real decision — not a research spree.
- **Verify, don't blindly trust.** A single blog can be wrong or SEO-spam. Prefer official docs —
  `sources.md` for the rules, context7 for framework APIs — and corroborate volatile claims across
  2+ sources before acting on them.
- **Cache within a run.** Look something up once; reuse it for the rest of the run. Don't re-fetch the
  same fact per page or per file.
- **Record it.** Note material findings in the run's reasoning and, if they changed a decision, in the
  score-card notes (e.g. "used Next.js 15 Metadata API per current docs"). This keeps runs auditable.
- **Offline fallback.** If a source is unreachable, fall back to `standards.md`/`geo.md`/`stack-detection.md`
  and say so — never block the whole run on a failed lookup.

## What NOT to do
- Don't fetch a row for an item that isn't in scope this run, or one already `done` and settled in
  `state.json`. The registry is an address book, not a curriculum.
- Don't send the user's private code or content to external services beyond what a normal docs/search
  query needs.
- Don't let research become the task. The goal is correct application, not a literature review.
