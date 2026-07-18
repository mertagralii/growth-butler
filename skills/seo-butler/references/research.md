# Live Knowledge — when and how specialists consult external sources

The butler has two live-knowledge tools so specialists can stay current instead of relying on
stale training data. Use them deliberately — targeted lookups, not open-ended browsing. (The plugin also
bundles other MCPs — Playwright for rendering, and the optional OpenSEO data layer — covered elsewhere.)

## Two sources, two jobs

### 1. context7 (bundled MCP) — framework & library specifics
Use for **"how do I do X correctly in this exact framework/version?"** SEO methods change between
framework versions (e.g. Next.js Metadata API, `app/sitemap.ts`, Astro's `@astrojs/sitemap`, Nuxt
`useSeoMeta`). Before implementing stack-specific code whose API you're not 100% sure is current:
- Resolve the library id, then query its docs for the precise, current mechanism.
- Prefer this over guessing. Wrong-version code is the #1 way the butler could break a site.
- Typical triggers: metadata/head API, sitemap/robots generation, i18n/hreflang config, image
  optimization component, script-loading helper for the analytics tag.

### 2. WebSearch / WebFetch — fast-moving SEO/GEO facts
Use for **"what's the current best practice / threshold / spec right now?"** SEO and GEO shift
quickly (metric thresholds, AI-crawler names, AI Overviews behavior, schema requirements). Use when:
- A `standards.md` / `geo.md` value might have moved and it materially affects the work.
- You need the current list of AI citation bots or a schema.org type's required fields.
- Competitor / keyword research in **keyless** mode (the strategy phase's free-signal path). When a
  real data provider is connected instead, use it rather than WebSearch — see `data-providers.md`.

## Discipline (don't waste tokens or trust blindly)
- **Targeted, not exploratory.** One or two precise lookups for a real decision — not a research spree.
- **Verify, don't blindly trust.** A single blog can be wrong or SEO-spam. Prefer official docs
  (framework docs via context7, Google/schema.org for standards) and corroborate volatile claims
  across 2+ sources before acting on them.
- **Cache within a run.** Look something up once; reuse it for the rest of the run. Don't re-fetch the
  same fact per page or per file.
- **Record it.** Note material findings in the run's reasoning and, if they changed a decision, in the
  score-card notes (e.g. "used Next.js 15 Metadata API per current docs"). This keeps runs auditable.
- **Offline fallback.** If a source is unreachable, fall back to `standards.md`/`geo.md`/`stack-detection.md`
  and say so — never block the whole run on a failed lookup.

## What NOT to do
- Don't fetch live sources for things already pinned and stable in the references (title length,
  canonical rules) — those are settled.
- Don't send the user's private code or content to external services beyond what a normal docs/search
  query needs.
- Don't let research become the task. The goal is correct application, not a literature review.
