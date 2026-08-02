# GEO Playbook — Generative Engine Optimization (2026)

GEO = getting **cited and recommended by AI answer engines** (ChatGPT/OpenAI search, Perplexity,
Google AI Overviews & AI Mode, Gemini, Microsoft Copilot, Claude), not just ranked by classic search.
This is the butler's biggest differentiator, so get it right — and be honest about what actually works.

## Why it matters (say this plainly, don't hype)
The overlap between top Google links and AI-cited sources has fallen from ~70% to under ~20%, and a
meaningful share of discovery is shifting to AI engines. Optimizing only for classic ranking now
leaves visibility on the table. But GEO is **earned by content and crawlability**, not by one magic file.

## The honest hierarchy of GEO levers (highest → lowest proven impact)

### Tier 1 — Crawlability (non-negotiable; do first)
If AI bots can't fetch or render the page, nothing else matters.
- **Do NOT block AI crawlers in robots.txt** (unless the user explicitly wants to opt out of AI).
  The citation-driving bots: `GPTBot` (ChatGPT), `OAI-SearchBot`, `ClaudeBot` (Claude),
  `PerplexityBot` (Perplexity), `Google-Extended` (Google AI), `Bingbot` (Copilot),
  `GoogleOther` (Google's separate non-Search crawler — AI Overviews eligibility),
  `Bytespider` (ByteDance), `CCBot` (Common Crawl — a large share of models train and retrieve from it).
  The last three are the most commonly missed, usually because a catch-all `User-agent: *` block
  sweeps them up without anyone intending to.
- **Server-side render the important content.** Client-only SPA content that needs JS to appear is
  often invisible to AI crawlers → flag SPAs and recommend SSR/SSG/prerender for key pages.
- No key content locked behind logins, paywalls, cookie walls, or interaction.
- Verify the CDN/WAF (e.g. Cloudflare) isn't silently 403-ing AI bot user-agents.

### Tier 2 — Content structure (answer-first)
AI engines extract quotable, self-contained answers.
- **Answer-first:** the first ~2 sentences / first 200 words of a page or section must *directly and
  completely* answer its core question — not build up to it.
- **Question-based headings:** AI pattern-matches headings to queries. Use "What is X?", "How does
  X work?", "X vs Y" as `<h2>`/`<h3>` — not vague labels like "Overview".
- **One topic per section**, clear h1→h2→h3 hierarchy, exactly one `<h1>` per page.
- **Scannable formats:** short paragraphs, bullet/numbered lists, comparison tables, definition
  sentences ("X is a …"). These are the shapes engines quote cleanly.
- **Listicle structure — check for it concretely.** "Scannable" is a feeling; this is the testable
  version. A page qualifies if it has at least one of: **numbered headings** (`<h2>1. …`), a **"Top N"
  / "N best" / "N ways" title pattern**, an **ordered list** (`<ol>`) carrying real content rather
  than navigation, or a **comparison table**. Engines lift these near-verbatim because the boundaries
  between items are unambiguous. Where a page *is* a list, mark it up as `ItemList` too (`standards.md`).
  Where it isn't, **don't force it** — a listicle shell around prose that isn't a list is worse than
  plain prose, for readers and engines alike.
- **FAQ blocks** for pages with common questions (pair with FAQPage schema — see standards.md).

### Tier 3 — Evidence & authority (citation boosters)
These three consistently come out ahead in published GEO experiments. **Do not quote a percentage for
them.** The widely-circulated figures trace back to a small number of studies on narrow corpora, and
this plugin does not repeat a number it cannot source — including in its own favour. Recommend them
on the mechanism, which is solid: an answer engine needs a reason to cite *you* rather than paraphrase
you, and a quotable line, a concrete figure, or a linked primary source is that reason.
- **Add quotations** — quotable sentences give an engine something to attribute.
- **Add statistics / concrete numbers** — specific figures get cited; vague claims get paraphrased.
- **Cite authoritative sources** (link out to research, official docs, recognized publications).
- Original research, proprietary data, benchmarks, and named-expert commentary attract citations
  because engines have a unique reason to reference you. Recommend these as content ideas.
- **Authorship & identity (E-E-A-T):** a named, real author with a bio, plus clear About/Contact pages
  and `Organization.sameAs` links, tell engines *who* stands behind the content — a trust signal for
  both ranking and citation. Mark up what's real (`author`/`Person` schema); recommend adding an author
  where content is bylined but anonymous. Never invent a person. Maps to checklist items 34–35.

### Tier 4 — Freshness
Engines weigh recency. Ensure visible `dateModified`/`datePublished`, keep cornerstone pages updated,
and expose dates in both the copy and Article/BlogPosting schema.

### Tier 5 — Structured data
Schema.org helps machines parse entities and Q&A. Prioritize Organization, WebSite, Article,
Product, FAQPage, BreadcrumbList (details in standards.md). Necessary hygiene, not a silver bullet.

### Tier 6 — llms.txt (do it, but set expectations honestly)
Create a root `/llms.txt`, because it's cheap, harmless, and future-proofs the site. **But be honest
in the report:** as of 2026 adoption is ~2% and **no major AI company officially consumes it yet** —
Google/OpenAI/Anthropic still crawl via normal bots regardless. So llms.txt is a *nice-to-have*, not
a ranking lever. Never present it as the thing that gets the site cited. The real wins are Tiers 1–4.

## llms.txt format (when you create it)
Root-level markdown, lean:
```
# Site / Brand Name

> One-sentence summary of what this site is and who it's for.

Optional short paragraph of context.

## Core pages
- [Page title](https://site.com/page): one-line description
- [Docs](https://site.com/docs): one-line description

## Optional
- [Changelog](https://site.com/changelog): ...
```
Keep it truthful and in sync with the real site. Optionally add `/llms-full.txt` with fuller content.

## What the butler actually does for GEO (maps to checklist B)
1. Ensure robots.txt allows the citation bots (Tier 1) and flag SSR gaps for SPAs.
2. Restructure key pages to answer-first + question headings + one h1 (Tier 2) — *structural* edits;
   substantive copy is proposed in the report, not silently rewritten.
3. Surface concrete **content suggestions** (Tier 3/4): where to add stats, quotes, sources, an FAQ,
   original data, or a freshness update. These go in the score card as recommendations.
4. Add FAQPage/Article schema where content justifies it (Tier 5).
5. Create llms.txt (Tier 6) with an honest note about its current, limited real-world weight.

## Honesty rules for GEO
- Never promise "you'll be cited by ChatGPT." GEO improves *odds*, it doesn't guarantee placement.
- Don't fabricate stats, quotes, or sources to hit the Tier-3 boosters — recommend the user add real ones.
- Distinguish clearly in the report between what you *did* (structure, schema, llms.txt) and what you
  *recommend the user add* (real data, quotes, expert commentary).
