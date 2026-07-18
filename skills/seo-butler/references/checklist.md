# The Fixed SEO/GEO Checklist

This list is **fixed**. It is the complete menu the butler audits every run. On a first run you
cover all of it; on later runs you re-check the same items — you never invent new ones. Each item
maps to a specialist and to a key in `.seo-butler/state.json`.

Statuses: `done` · `partial` · `skipped` (user chose to skip) · `todo` · `n/a` (not applicable to this stack).

## A. Technical SEO — `seo-technical`
1. **robots.txt** — present, not blocking the whole site, points to sitemap.
2. **sitemap.xml** — all indexable URLs, correct `<loc>`, `lastmod`; referenced from robots.txt.
3. **Title tags** — unique per page, within length budget (see standards).
4. **Meta description** — unique per page, within length budget.
5. **Canonical URLs** — every page declares its canonical; no duplicate-content ambiguity.
6. **hreflang** — only if the site is multilingual; otherwise `n/a`.
7. **Open Graph tags** — og:title, og:description, og:image, og:url, og:type.
8. **Twitter Card tags** — summary_large_image with image.
9. **Structured data (JSON-LD)** — at minimum Organization + WebSite; add per-page types
   (Article/Product/FAQ/BreadcrumbList/LocalBusiness) where the content justifies it.
10. **Favicon + web manifest + theme-color** — basic app/meta presence.
11. **Meta robots / noindex hygiene** — no accidental `noindex` on pages that should rank; staging
    or thin pages correctly excluded.
12. **Clean, descriptive URLs** — flag obviously bad patterns (query-string-only, IDs) as a note.
13. **Broken links** — internal links resolve to real routes/files (fix in-plan when the target is
    unambiguous, else report); external links checked best-effort and **report-only** (never auto-fixed).
14. **Edge/CDN robots override** — if the site is live, fetch `https://<site>/robots.txt` and compare it
    with what the code serves. A difference means a CDN/WAF is shadowing the origin — see `cdn-layer.md`.
    Fixed in the provider's dashboard, not the repo. `n/a` if the site isn't live yet.
15. **Canonical ↔ internal-link consistency** — in the **rendered** HTML, do internal links point at the
    canonical variant? Frameworks with several routes bound to one handler can emit the wrong one, so the
    site feeds its own duplicates even when canonical is correct. Source reading is not enough.
16. **Stale/orphan public files** — scan the public/static dir for HTML reachable over HTTP but referenced
    by no route or link (old mockups, backups, `-old`/`-copy`). Recommend deleting or disallowing.

## B. GEO & On-page content — `seo-geo-content`  (see `geo.md` for the full GEO playbook + honest tiers)
17. **AI crawlability** — robots.txt allows citation bots (GPTBot, OAI-SearchBot, ClaudeBot,
    PerplexityBot, Google-Extended, Bingbot); key content is server-rendered (flag SPA gaps);
    nothing important behind login/paywall. **(Tier 1 — highest impact.)**
18. **Answer-first structure** — key pages/sections answer their core question in the first ~2
    sentences; question-based headings ("What is X?"); one clear h1; scannable lists/tables. **(Tier 2.)**
19. **Semantic HTML** — correct h1–h3 hierarchy, landmarks, one h1 per page.
20. **AI-answer readiness** — definitional sentences + FAQ blocks where genuinely useful.
21. **Content suggestions (evidence & freshness)** — concrete, per-page recommendations surfaced in
    the report, not auto-written: add real statistics/quotes/cited sources (measured citation
    boosters), add an FAQ, add original data, refresh dates. **(Tiers 3–4.)**
22. **llms.txt** — create root-level file (cheap, future-proofing) **but report its impact honestly**:
    ~2% adoption, no major AI company officially consumes it yet. Nice-to-have, not a ranking lever. **(Tier 6.)**
23. **Internal linking** — no orphan pages; contextual links between related pages; descriptive anchor
    text; reasonable click depth. Adding links touches body content → **propose in the plan, apply on approval**.
24. **Keyword / topic targeting** — each page has one clear primary topic/intent present in
    title/H1/first ~100 words/meta/URL; flag **cannibalization** (two pages competing for the same term).
    Meta/title/H1/alt edited directly; **body-copy edits proposed in the plan, applied on approval** (never silent).
25. **Content authenticity** — detect testimonial/review/rating/statistic blocks that look fabricated
    (e.g. one glowing review per feature, in feature order, all 5 stars; unsourced numbers). If they can't
    be verified: never add `Review`/`AggregateRating` schema for them, **ask the user whether they're real**,
    and if invented, report it as a **misleading-advertising / consumer-law risk**, not just an SEO issue —
    then offer to remove, mark clearly, or replace with genuine content.

## C. Performance — `seo-performance`  (2026 thresholds in `standards.md`)
26. **Core Web Vitals** — identify likely LCP (≤2.5s) / INP (≤200ms) / CLS (≤0.1) problems from the code.
27. **Image optimization** — dimensions set, modern formats, lazy-loading where safe.
28. **Render-blocking / bundle notes** — flag heavy blocking resources; apply safe code fixes,
    report the rest.

## D. Accessibility (SEO-adjacent) — `seo-accessibility`
29. **Image alt text** — every meaningful image has descriptive alt; decorative images `alt=""`.
30. **Link text** — no bare "click here"; descriptive anchors.
31. **Language attribute** — `<html lang>` set correctly.

## E. Dashboards — `seo-analytics`
32. **Google Search Console** — site added, ownership verified, sitemap submitted.
33. **Google Analytics (GA4)** — property set up, measurement tag injected into the site.

> Dashboard items (32–33) always prepare their code side first (verification file/meta, GA4 tag)
> so the code is complete even if the browser steps must be finished by the user.

## F. E-E-A-T / authority & trust — `seo-geo-content` (+ `seo-technical` for schema)  (see `standards.md`)
34. **Authorship & author schema** — bylined content names a real author; where one exists, add `author`
    (`Person`) to Article/BlogPosting schema (name, bio/author-page `url`, `sameAs`). If content is
    bylined but has no visible author/bio, **recommend adding one** — never invent a person. **(E-E-A-T.)**
35. **Trust & identity signals** — reachable, linked **About** + **Contact** pages, and
    `Organization.sameAs` populated from the real social/profile URLs in `state.json`. Flag what's
    missing; don't fabricate profiles. (Local-business NAP consistency lives in the opt-in local-SEO module.)
