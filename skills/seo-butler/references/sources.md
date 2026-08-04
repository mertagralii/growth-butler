# Canonical Sources — read the spec, don't recall it

`standards.md` and `geo.md` pin roughly thirty values: title length, Core Web Vitals thresholds, the
AI citation-bot list, sitemap limits, which schema types earn rich results. Every one of them is a
claim about somebody else's product, and every one of them can move without telling us.

This file is the address book. **Before working a checklist item, fetch that item's official
documentation and work from what it says now** — not from what the pinned reference remembers, and
not from training data.

The pinned references don't go away: they are the offline fallback, the tie-breaker, and the record of
what "good" means when a source is unreachable. What changes is which one you consult *first*.

## Why this is not paranoia

Every URL below was fetched and confirmed before being written down. In that single pass, on
2026-08-05, **five of the addresses a model would recall from memory had already moved**:

| Remembered | Actually serves the doc now |
|---|---|
| `developers.google.com/search/docs/crawling-indexing/robots/robots_txt` | `developers.google.com/crawling/docs/robots-txt/…` |
| `developers.google.com/search/docs/crawling-indexing/overview-google-crawlers` | `developers.google.com/crawling/docs/crawlers-fetchers/…` |
| `platform.openai.com/docs/bots` | `developers.openai.com/api/docs/bots` |
| `support.anthropic.com/en/articles/8896518-…` | `support.claude.com/en/articles/8896518-…` |
| `docs.perplexity.ai/guides/bots` | `docs.perplexity.ai/docs/resources/perplexity-crawlers` |

Google split its crawling documentation into a separate section, OpenAI moved its developer site, and
Anthropic moved support to a new domain. All five still resolve today because the old paths redirect —
redirects that will not last forever. If the address of the document drifts this fast, so does the
document.

**`?hl=en` is deliberate on every Google-hosted URL.** Those hosts geo-redirect: fetched bare from a
machine in Turkey, the robots.txt specification came back in Polish, the crawler overview in Thai, and
Web Vitals in Hindi. The parameter pins the response to English so the fetch is reproducible and the
agent can actually read it. Don't strip it.

---

## A · Technical SEO — `seo-technical` (items 1–16)

| Items | What it settles | Source |
|---|---|---|
| 1, 11 | robots.txt syntax, matching precedence, what Google actually honours | https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec?hl=en |
| 11 | `noindex` / `nofollow` / `max-snippet` meta and `X-Robots-Tag` directives | https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag?hl=en |
| 2 | sitemap format, the 50,000-URL / 50 MB limits, `lastmod` semantics | https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=en |
| 2 | the sitemap XML protocol itself (tag set, escaping) | https://www.sitemaps.org/protocol.html |
| 3 | how Google generates title links and when it rewrites yours | https://developers.google.com/search/docs/appearance/title-link?hl=en |
| 4 | how snippets/meta descriptions are chosen and displayed | https://developers.google.com/search/docs/appearance/snippet?hl=en |
| 5 | canonical declaration and duplicate consolidation | https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=en |
| 6 | hreflang / localized versions | https://developers.google.com/search/docs/specialty/international/localized-versions?hl=en |
| 7 | the Open Graph protocol | https://ogp.me/ |
| 9 | **which structured-data types actually earn a rich result, and their required fields** | https://developers.google.com/search/docs/appearance/structured-data/search-gallery?hl=en |
| 9 | structured-data general guidelines (what gets you a manual action) | https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data?hl=en |
| 9 | the schema.org vocabulary — type definitions and properties | https://schema.org/ |
| 12 | URL structure best practices | https://developers.google.com/search/docs/crawling-indexing/url-structure?hl=en |
| 13 | redirects, chains, and how Google reads them | https://developers.google.com/search/docs/crawling-indexing/301-redirects?hl=en |
| all | Search Essentials — the baseline eligibility rules | https://developers.google.com/search/docs/essentials?hl=en |

**Item 8 (X / Twitter cards) has no reachable official documentation.** Verified on 2026-08-05: every
path under `developer.twitter.com`, `developer.x.com` and `docs.x.com` either 404s or redirects to a
generic `docs.x.com/overview` landing page carrying no card reference. Third-party pages claiming to
mirror it link back to the same dead paths. So item 8 runs on the pinned values in `standards.md`, and
this line exists so a future run doesn't waste a fetch rediscovering that — **and so the gap is stated
rather than papered over with a URL that looks official and isn't.** If X restores the docs, add the
address here after fetching it.

## B · GEO & content — `seo-geo-content` (items 17–25, plus 1, 34–35)

| Items | What it settles | Source |
|---|---|---|
| 1, 17 | Google's crawler user-agents, incl. `Google-Extended` and `GoogleOther` | https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers?hl=en |
| 1, 17 | OpenAI's crawlers — `GPTBot`, `OAI-SearchBot`, `ChatGPT-User` | https://developers.openai.com/api/docs/bots |
| 1, 17 | Anthropic's crawlers — `ClaudeBot` and friends | https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler |
| 1, 17 | `PerplexityBot` and Perplexity-User | https://docs.perplexity.ai/docs/resources/perplexity-crawlers |
| 1, 17 | `CCBot` — Common Crawl, which many models retrieve from | https://commoncrawl.org/ccbot |
| 17 | whether JS-rendered content is crawlable; SSR/prerender guidance | https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics?hl=en |
| 18, 20 | **Google's own guidance for AI Overviews / AI Mode eligibility** | https://developers.google.com/search/docs/appearance/ai-features?hl=en |
| 21, 34, 35 | helpful-content and E-E-A-T guidance, in Google's words | https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=en |
| 22 | the llms.txt format and its actual adoption status | https://llmstxt.org/ |

The five crawler documents are the highest-value rows in this file. The bot list is the fastest-moving
fact the butler holds, a new entrant costs the user real citations until robots.txt names it, and
**adding a bot is additive** — see the contradiction rule below.

## C · Performance — `seo-performance` (items 26–28)

| Items | What it settles | Source |
|---|---|---|
| 26 | which metrics are Core Web Vitals *right now*, and their thresholds | https://web.dev/articles/vitals?hl=en |
| 26 | LCP — definition, good/poor bands, common causes | https://web.dev/articles/lcp?hl=en |
| 26 | INP — the metric that replaced FID | https://web.dev/articles/inp?hl=en |
| 26 | CLS — definition and measurement window | https://web.dev/articles/cls?hl=en |
| 26–28 | the PageSpeed Insights API `measurement.md` calls | https://developers.google.com/speed/docs/insights/v5/get-started?hl=en |

The Core Web Vitals set is not permanent — FID was a Core metric until INP replaced it in March 2024.
`standards.md` pins today's three; `web.dev/articles/vitals` is where a fourth change would appear first.

## D · Accessibility — `seo-accessibility` (items 29–31)

| Items | What it settles | Source |
|---|---|---|
| 29 | the alt-text decision tree: informative vs decorative vs functional | https://www.w3.org/WAI/tutorials/images/ |
| 30, 31 | WCAG 2.2 success criteria for link purpose and language of page | https://www.w3.org/WAI/WCAG22/quickref/ |
| 31 | the `lang` attribute and valid language tags | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang |

## E · Dashboards — `seo-analytics` (items 32–33)

| Items | What it settles | Source |
|---|---|---|
| 32 | Search Console ownership verification — the current methods and UI | https://support.google.com/webmasters/answer/9008080?hl=en |
| 32 | submitting a sitemap and reading the Sitemaps report | https://support.google.com/webmasters/answer/7451001?hl=en |
| 33 | GA4 property setup and the measurement tag | https://support.google.com/analytics/answer/9304153?hl=en |

These three change **UI**, not rules — button labels and menu paths move, which is exactly what breaks
a step-by-step guide the user is following in a browser. Read them before walking someone through the
panel, not before writing code.

---

## How to use this

**When to read.** Only for items in scope this run. Skip anything already `done` and settled in
`state.json`, and skip the rows whose facts you are not about to act on. Reading Google's snippet doc
to fix an image `alt` is waste, and this file is not a curriculum.

**Which layer answers what.** Three live-knowledge tools, three jobs — keep them apart:

| Question | Tool |
|---|---|
| *What is the rule?* | **this registry** — the official spec |
| *How do I express it in this framework and version?* | **context7** (`research.md`) |
| *Something fast-moving with no row here* | **WebSearch**, corroborated across two sources |

If a row exists here, use it. WebSearch is the fallback for facts this file doesn't cover — not a
shortcut around it, because a blog summarising Google's docs is strictly worse than Google's docs.

**What to do with what you read.**

- **Additions to a list apply this run.** A crawler that appears in OpenAI's or Google's document but
  not in `standards.md` goes into the robots.txt work for this run. It is an addition, not a
  correction; the risk is nil and waiting for a plugin release costs the user citations in the
  meantime. It still goes through the normal plan gate — like every other change, the user sees it
  before it is written.
- **Anything that contradicts a pinned value does not apply.** If the source states a threshold,
  length or requirement that disagrees with `standards.md`, **the pinned value governs this run** and
  the disagreement goes in the report notes with both values and the source URL. One misread page must
  never rewrite a user's site. This is `ground-truth.md`'s *evidence, not verdict* rule, applied to
  documentation instead of auditors.
- **Removals are contradictions, not additions.** A schema type disappearing from the rich-results
  gallery, or a bot dropping off a list, is reported — never acted on silently.

**When a source is unreachable.** Fall back to `standards.md` / `geo.md`, do the work, and **say which
source you couldn't reach and why**. Never block a run on a failed fetch, and never let a skipped
lookup read as a confirmed one. Same rule as everywhere else in this plugin: unmeasured is reported
with its reason, not quietly assumed fine.

**Cost.** One fetch per document per run, cached for the rest of the run. Five specialists reading the
same crawler list five times is five times the tokens for one fact — which is why the orchestrator
fetches the shared rows once and passes the result down in the brief (`commands/seo.md`).

**Keeping this file honest.** Rows carry a URL only after someone fetched it and confirmed the document
is really there and really says what the row claims. A plausible-looking address written from memory is
worse than no row at all: it sends every future run to a 404, or — as with X's cards docs — to a
generic landing page that reads like documentation and contains nothing. If you cannot verify it,
record the absence the way item 8 does.
