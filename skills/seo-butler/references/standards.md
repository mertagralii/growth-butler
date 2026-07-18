# Best-Practice Standards (decide like an expert, don't ask)

The defaults the butler applies. When a choice arises, use these instead of asking the user. Values
reflect 2026 reality. GEO-specific guidance lives in `geo.md`.

## Titles (`<title>`)
- **Length:** aim 50–60 characters; hard cap ~60 (Google truncates ~600px, roughly 60 chars). Unique per page.
- **Pattern:** `Primary Topic — Brand` on inner pages; `Brand — Value Proposition` on the home page.
- Front-load the most important words; one clear intent per page; no keyword stuffing or repetition.
- Must match the page's actual `<h1>` intent (don't promise something the page doesn't deliver).

## Meta descriptions
- **Length:** aim 140–160 characters; hard cap ~160. Unique per page. Written for humans (it's a CTR
  lever, not a ranking factor). Google may rewrite it — still provide a good one.
- One sentence describing the page's value + a soft call to action. Include the primary term naturally.
- Never leave it empty on key pages; never duplicate across pages.

## Canonical
- Every indexable page self-references its **clean, absolute** canonical URL: `https`, chosen host
  (www vs non-www — pick one, stay consistent), consistent trailing-slash convention, **no tracking
  params** (utm_, fbclid, gclid, session ids).
- Paginated/filtered/duplicate variants point to the canonical primary. Don't canonicalize a page to
  an unrelated URL.

## Robots directives & indexation hygiene
- Public pages: indexable (no stray `noindex`). Thin/utility pages (internal search results, cart,
  auth, thank-you, staging) → `noindex`.
- Never leave a site-wide `noindex` or `Disallow: /` from a staging build in production — this is a
  top cause of "my site vanished from Google." Check for it explicitly.

## robots.txt
- Allow crawling of the public site. `Disallow` only genuine non-public paths (admin, internal APIs,
  cart, infinite filter permutations). Always include an absolute `Sitemap:` line.
- **Do NOT block AI citation bots** unless the user opts out (see `geo.md` Tier 1): GPTBot,
  OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot.

## sitemap.xml
- Include only indexable, canonical, 200-status URLs (exclude noindex, redirects, auth-gated, canonicalized-away).
- Valid XML; accurate `<lastmod>` from real content/file dates; split into a sitemap index if >50k URLs or >50MB.
- Reference it from robots.txt and submit it in Search Console.

## Open Graph / Twitter
- OG: `og:title`, `og:description`, `og:url` (canonical, absolute), `og:type` (`website` for
  home/landing, `article` for posts), `og:image` (absolute URL, **1200×630**, <5MB), `og:site_name`, `og:locale`.
- Twitter: `twitter:card = summary_large_image`, plus title/description/image.
- **Generate a missing OG image (don't just flag it)** — see the method below.

### Rendering an OG image (1200×630)

Only when a page/site has **no** `og:image`. Never overwrite an existing one — fill the gap, nothing more.

Render text as real text in a headless browser; never generate the card as a raster image from a
model. This is the deterministic, text-crisp path:

1. **Write an HTML template** to a temp file: a `1200×630` root element, brand background, the brand
   name, and a page-appropriate headline. Use system font stacks so nothing depends on a network fetch.
   Pull the brand name, headline source, colors, and logo from `state.json` / the site's real content —
   **never invent a logo or brand colors.** If the brand has no known colors, use a neutral dark card.
2. **Screenshot it with the bundled Playwright MCP** at exactly `1200×630`, `deviceScaleFactor: 1`,
   `omitBackground: false`, full-element (not full-page) capture.
3. **Read the PNG back and verify it is really 1200×630** before accepting it. A card at the wrong
   size is worse than no card — social platforms crop it unpredictably. PNG dimensions live in the
   IHDR chunk: bytes 16–19 are the width and 20–23 the height, both big-endian `uint32`.
4. **Save** it to the stack's public/static dir and reference it as an **absolute** URL.

**Fallback:** if Playwright isn't available in the session, report the missing `og:image` as a finding
rather than shipping a broken or wrongly-sized card.

## Structured data (JSON-LD) — pick types by real content
Emit as `<script type="application/ld+json">`. **Only assert facts present on the page.** Never
fabricate ratings, prices, authors, or reviews (Google penalizes this; it also breaks trust).
- **Always:** `Organization` (or `LocalBusiness` if there's a real address/phone) + `WebSite`
  (add `potentialAction` SearchAction *only* if the site has real on-site search).
- **Article / BlogPosting** for posts: headline, author, `datePublished`, `dateModified`, image, publisher.
- **Product** for product pages: name, image, description, brand, and `Offer` (price, priceCurrency,
  availability) — only if that data is truly on the page. Add `AggregateRating`/`Review` only if real.
- **FAQPage** for genuine Q&A content (also a strong GEO signal).
- **BreadcrumbList** where navigation/breadcrumbs exist.
- **HowTo** for genuine step-by-step instructions on the page: `name`, ordered `step` list (each with
  `text`, optional `image`/`name`). Only when the page really is a how-to — not for generic prose.
- **VideoObject** when a real video is embedded: `name`, `description`, `thumbnailUrl`, `uploadDate`,
  and `contentUrl`/`embedUrl`. Don't add it for decorative background clips.
- **Event** for real events with a date/venue: `name`, `startDate`, `location` (or `VirtualLocation`),
  and `eventStatus`/`eventAttendanceMode` where known. Never fabricate dates or venues.
- Validate mentally against schema.org required/recommended fields; prefer completeness on recommended fields.
- **Only assert what's genuinely on the page.** These richer types unlock rich results only when the
  visible content backs them — mismatched/absent content is a Google manual-action risk, not a win.

## E-E-A-T / authority & trust signals
Experience, Expertise, Authoritativeness, Trust — signals both Google and AI answer engines weigh when
deciding who to rank and cite. All are **fact-based**: surface and mark up what's real; recommend (never
fabricate) what's missing.
- **Authorship:** bylined content (blog posts, articles, guides) should name a real author. Where an
  author exists, add `author` (`Person`) to the Article/BlogPosting schema — with the author's name and,
  if present, a link to an author/bio page (`url`) and their profiles (`sameAs`). If content is bylined
  but has no visible author or bio, **recommend adding one** — don't invent a person.
- **Identity / trust pages:** the site should have reachable **About** and **Contact** pages, linked from
  navigation or footer. These are baseline trust signals; flag if missing.
- **`Organization.sameAs`:** populate the Organization schema's `sameAs` with the brand's real social/
  profile URLs discovered in `state.json` (footer/contact/about). Don't add profiles you can't verify.
- These map to checklist section F (items 34–35). NAP (name/address/phone) consistency for local
  businesses is handled separately by the opt-in local-SEO module, not here.

## Favicon / manifest / head hygiene
- Favicon (ico + svg + apple-touch-icon), `theme-color`, `<meta name="viewport">`, `<meta charset>`,
  `<html lang>`. A `manifest.webmanifest` for installable/PWA-ish sites.

## Accessibility (helps SEO)
- Meaningful images: specific, useful `alt` (describe content + purpose, not the filename). Decorative
  images: `alt=""`. Never omit the attribute entirely.
- Descriptive link text (no bare "click here"). `<html lang>` matches primary content language.

## Performance — Core Web Vitals (2026 thresholds)
Google measures at the **75th percentile of real users (CrUX)**. "Good" targets:
- **LCP (loading)** — ≤ **2.5 s** (poor > 4.0 s). Usually the hero image or web font.
- **INP (responsiveness)** — ≤ **200 ms** (poor > 500 ms). Replaced FID in March 2024; the most
  commonly failed metric. Caused by heavy/long JS tasks blocking the main thread.
- **CLS (visual stability)** — ≤ **0.1** (poor > 0.25). Caused by images/ads/embeds without reserved
  space, or late-injected content and fonts.

**Apply automatically (safe):** explicit `width`/`height` (or aspect-ratio) on images to kill CLS;
`loading="lazy"` below the fold; `fetchpriority="high"` + preload on the LCP image; `preconnect`/
`dns-prefetch` for known third-party origins; `font-display: swap`.
**Report, don't force (risky):** JS bundle splitting, hydration/framework config, third-party script
removal, reordering scripts — anything that could change behavior. Put these in the score card notes.

## Broken links
- **Internal links:** every internal `href` must resolve to a real route/file/anchor. Detect from the
  route map / file tree (and, for a running site, by checking responses). When the intended target is
  **unambiguous** (obvious typo, moved path with a clear replacement), fix it in the plan; otherwise
  **report** it with the source location so the user decides.
- **External links:** best-effort HTTP check. Treat as **report-only** — never auto-edit or remove.
  External sites go down for reasons that aren't the user's fault, and checks are flaky; surface a list
  of suspected-dead externals, don't act on them.

## Internal linking
- **No orphan pages:** every indexable page should be reachable via at least one internal link.
- **Contextual links:** connect genuinely related pages (topic clusters); link important pages more.
- **Descriptive anchors:** anchor text describes the destination (no bare "click here" / "read more").
- **Reasonable depth:** key pages within ~3 clicks of the home page.
- Adding links edits body content → **propose in the plan and apply on approval**; don't stuff links.

## Keyword / topic targeting
- **One clear intent per page.** Identify each page's primary topic/keyword from its actual content
  (don't invent one). The primary term should appear naturally in the **title, H1, first ~100 words,
  meta description, and ideally the URL slug** — without keyword stuffing.
- **Semantic coverage:** include the natural related terms/entities a page on this topic would have;
  optimize for topic, not exact-match repetition.
- **Cannibalization:** if two pages target the same intent/term, flag it and recommend consolidating or
  differentiating them — don't silently merge.
- **Edit boundary:** meta / title / H1 / alt are edited **directly**; edits to the user's **body copy**
  are **proposed in the plan and applied on approval** — never silent, never fabricated. No new articles.

## The one thing you DON'T decide: business facts
Site/brand name, contact email, postal address, phone, social profile URLs. Read them from the
codebase/content first (footer, contact/about page, `package.json`, existing meta, `Organization`
data). Store them in `state.json`. Only if truly absent, ask 1–2 plain questions. Everything else is
yours to decide as the expert.
