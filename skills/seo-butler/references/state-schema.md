# Persistent Memory — `.seo-butler/state.json`

Written to the **target project root**, not the plugin. This is the butler's memory across runs: it
makes the butler consistent (trusts `done`, acts only on real deltas) instead of re-auditing settled
work and re-asking what it already learned. Read it first; keep it current.

## Location
`./.seo-butler/state.json` (create the `.seo-butler/` folder if missing).

**Suggest adding `.seo-butler/` to `.gitignore`.** It holds a business profile and site facts that
many people would rather not commit. If the user prefers to track it (the history is genuinely useful
in a team repo), that's their call — ask once, record the answer, don't ask again.

**Everything the butler writes goes under `.seo-butler/`** — screenshots, exports, downloaded CSVs,
scratch files, reports. The user's project root is theirs; leaving files there is rude and they end
up in `git status` as noise the user has to triage. Use `.seo-butler/tmp/` for anything transient and
delete it when the run ends. If a bundled tool insists on writing to the working directory anyway,
**say so at the end of the run and offer to add it to `.gitignore`** rather than leaving the user to
discover it later in `git status`.

**Migration from v1.x:** if `./.growth-butler/state.json` exists (from the growth-butler era), read it
as the baseline and write forward to `.seo-butler/`, then tell the user the old folder can be deleted.
If **both** `.growth-butler/` and an older `.seo-butler/` exist, `.growth-butler/` is the newer one —
it wins. Never lose the user's history. Drop any `families`, `journey`, `launch`, `ads`, `email`,
`social` or `content` blocks found in a v1 file; they belong to families this plugin no longer has.

## The profile
`project` + `business` together are the site profile. Beyond contact facts, capture the value
proposition, the target audience, and the brand voice — discovered from the site's real content. These
drive GEO topic targeting, `Organization` schema, and the tone of any copy the butler proposes.

## Schema

```json
{
  "version": 1,
  "project": {
    "stack": "next-app-router",
    "detectedAt": "2026-07-19",
    "pageCount": 12,
    "languages": ["en"],
    "siteUrl": "https://example.com"
  },
  "lastRun": "2026-07-19",
  "business": {
    "name": "Example Co",
    "email": "hello@example.com",
    "address": null,
    "social": ["https://twitter.com/example"],
    "valueProp": "one-line what-it-does-for-whom (from real content)",
    "audience": "who it's for",
    "brandVoice": "e.g. plain, technical, playful — inferred from the copy"
  },
  "items": {
    "robots_txt":        { "status": "done",    "date": "2026-07-19", "scope": "1 file",        "notes": "sitemap referenced" },
    "sitemap_xml":       { "status": "done",    "date": "2026-07-19", "scope": "12 URLs" },
    "titles":            { "status": "done",    "date": "2026-07-19", "scope": "12/12 pages" },
    "meta_description":  { "status": "partial", "date": "2026-07-19", "scope": "10/12 pages",   "notes": "2 pages need real copy" },
    "canonical":         { "status": "done",    "date": "2026-07-19" },
    "hreflang":          { "status": "n/a",     "notes": "single language" },
    "open_graph":        { "status": "done",    "date": "2026-07-19" },
    "twitter_card":      { "status": "done",    "date": "2026-07-19" },
    "structured_data":   { "status": "done",    "date": "2026-07-19", "scope": "Organization + WebSite + 3 Article" },
    "favicon_manifest":  { "status": "done",    "date": "2026-07-19" },
    "robots_hygiene":    { "status": "done",    "date": "2026-07-19" },
    "url_quality":       { "status": "done",    "date": "2026-07-19" },
    "broken_links":      { "status": "done",    "date": "2026-07-19", "scope": "0 internal broken; 2 external flagged (report-only)" },
    "edge_robots_check": { "status": "done",    "date": "2026-07-19", "notes": "live robots.txt matched origin (no CDN override)" },
    "canonical_link_consistency": { "status": "done", "date": "2026-07-19", "notes": "rendered internal links all point at canonical" },
    "stale_public_files":{ "status": "partial", "notes": "21 legacy mockups under /html/ — Disallow added, deletion recommended" },
    "ai_crawlability":   { "status": "done",    "date": "2026-07-19", "notes": "robots allows GPTBot/ClaudeBot/PerplexityBot/Google-Extended; SSR ok" },
    "answer_first":      { "status": "done",    "date": "2026-07-19", "scope": "5 key pages restructured" },
    "semantic_html":     { "status": "done",    "date": "2026-07-19" },
    "ai_readiness":      { "status": "done",    "date": "2026-07-19" },
    "content_suggestions": { "status": "done", "date": "2026-07-19", "notes": "5 suggestions in report" },
    "llms_txt":          { "status": "done",    "date": "2026-07-19", "notes": "created; low real-world weight in 2026 — nice-to-have" },
    "internal_linking":  { "status": "done",    "date": "2026-07-19", "scope": "1 orphan fixed; 4 contextual links added (approved)" },
    "keyword_optimization": { "status": "done", "date": "2026-07-19", "scope": "12/12 pages targeted; 1 cannibalization flagged" },
    "content_authenticity": { "status": "done", "date": "2026-07-19", "notes": "10 fabricated testimonials found; user chose removal" },
    "core_web_vitals":   { "status": "partial", "notes": "LCP image flagged; fix reported" },
    "image_optimization":{ "status": "done",    "date": "2026-07-19" },
    "render_blocking":   { "status": "partial", "notes": "1 blocking script reported" },
    "image_alt":         { "status": "done",    "date": "2026-07-19", "scope": "8/8 images" },
    "link_text":         { "status": "done",    "date": "2026-07-19" },
    "html_lang":         { "status": "done",    "date": "2026-07-19" },
    "search_console":    { "status": "partial", "notes": "verification meta added; user finished verify in browser" },
    "analytics_ga4":     { "status": "done",    "date": "2026-07-19", "scope": "G-XXXXXXX injected" },
    "eeat_authorship":   { "status": "partial", "date": "2026-07-19", "notes": "Person schema added to 3 posts; 2 posts bylined but no bio — recommended" },
    "trust_identity":    { "status": "done",    "date": "2026-07-19", "notes": "About + Contact linked; Organization.sameAs populated from footer socials" }
  },
  "scoreHistory": [
    { "date": "2026-07-19", "before": 38, "after": 91 }
  ],
  "deploy": {
    "deployedAt": null,
    "liveVerifiedAt": null,
    "liveUrl": "https://example.com",
    "liveScore": null,
    "openFindings": []
  },
  "measurements": {
    "measuredAt": "2026-07-22",
    "source": "psi",
    "strategy": "mobile",
    "lighthouse": [
      { "url": "/",        "performance": 78, "seo": 100, "accessibility": 94, "bestPractices": 92 },
      { "url": "/pricing", "performance": 81, "seo": 100, "accessibility": 96, "bestPractices": 92 }
    ],
    "crux": { "lcp": "2.1s", "inp": "240ms", "cls": "0.05", "note": null },
    "searchConsole": {
      "periodStart": "2026-08-02", "periodEnd": "2026-08-29", "source": "openseo-gsc",
      "totals": { "clicks": 389, "impressions": 11830, "ctr": 0.033, "avgPosition": 16.8 },
      "coverage": { "discovered": 12, "indexed": 11, "errors": 3 },
      "topQueries": [
        { "query": "seo audit tool", "clicks": 61, "impressions": 890, "position": 11.2 }
      ],
      "topPages": [
        { "page": "/pricing", "clicks": 24, "impressions": 1240, "position": 19.0 }
      ],
      "history": [
        { "periodStart": "2026-07-05", "periodEnd": "2026-08-01", "source": "openseo-gsc",
          "totals": { "clicks": 142, "impressions": 4210, "ctr": 0.034, "avgPosition": 24.1 },
          "coverage": { "discovered": 5, "indexed": 1, "errors": 0 } }
      ]
    },
    "unavailable": [
      { "what": "crux", "reason": "no field data yet — site is new / low traffic" }
    ],
    "history": [
      { "measuredAt": "2026-07-15", "source": "local-lighthouse", "strategy": "mobile",
        "lighthouse": [ { "url": "/", "performance": 62, "seo": 91, "accessibility": 88, "bestPractices": 83 } ],
        "crux": null }
    ]
  },
  "groundTruth": {
    "sources": {
      "geodaddy":      { "connected": true,  "checkedAt": "2026-08-02" },
      "openseo":       { "connected": true,  "checkedAt": "2026-08-02",
                         "projectId": "eec24ec2-…", "creditsRemaining": 468 },
      "searchConsole": { "connected": false, "checkedAt": "2026-08-02",
                         "reason": "property not yet connected inside OpenSEO — inspect_urls unavailable" }
    },
    "lastRunAt": "2026-08-02",
    "rounds": 2,
    "stoppedBecause": "no act findings remained",
    "closed": [
      { "item": 13, "what": "/Home/Index 404 linked from 3 pages", "sources": ["openseo"],
        "fixedAt": "2026-08-02", "reverifiedAt": "2026-08-03" }
    ],
    "dismissed": [
      { "item": 9, "what": "geodaddy cont-json-ld 'missing @type'", "source": "geodaddy",
        "reason": "root @graph pattern; every node has @type. Verified by parsing the blocks.",
        "date": "2026-08-02" }
    ],
    "open": [
      { "item": 14, "what": "/cdn-cgi/l/email-protection 404 on 5 pages", "owner": "user",
        "reason": "Cloudflare Email Obfuscation — dashboard toggle, not a repo fix" }
    ]
  },
  "watch": {
    "lastCheckedAt": "2026-07-22",
    "history": [
      { "date": "2026-07-22", "status": "stable", "findings": [] },
      { "date": "2026-07-15", "status": "regression", "findings": [
        { "what": "robots.txt changed at the edge", "severity": "high", "since": "2026-07-08" }
      ] }
    ],
    "skipped": [
      { "what": "search-console", "reason": "no logged-in browser in unattended run" }
    ]
  },
  "strategy": {
    "providerChoice": "keyless",
    "choiceMadeAt": "2026-07-19",
    "lastRun": "2026-07-19",
    "source": "keyless",
    "clusters": [
      { "name": "example topic", "intent": "informational", "signal": "medium", "volume": null, "difficulty": null, "target": "/existing-page" },
      { "name": "gap topic", "intent": "commercial", "signal": "high", "volume": null, "difficulty": null, "target": null, "gap": true }
    ],
    "competitorGaps": [
      { "competitor": "competitorA.com", "topic": "thing they cover, you don't", "priority": "high" }
    ],
    "recommendedTopics": ["<prioritized topic 1>", "<prioritized topic 2>"]
  }
}
```

> The `strategy` block is **separate from the fixed checklist**. Strategy is an optional, advisory
> deliverable — it is NOT one of the `items`. It exists only after the user has run the strategy
> phase; omit it entirely on runs where strategy wasn't approved.
>
> `providerChoice` is the user's **informed, one-time decision** about the data layer — `"keyless"`,
> `"openseo"`, or `"dataforseo"`. Absent means *not asked yet*: the next strategy run must put the
> choice to them (cost stated up front) per `data-providers.md`. Present means **honour it silently** —
> never re-ask, never nag a keyless user into paying. Only re-ask if they want to change it, or if a
> chosen provider stops responding.
>
> `source` records how *this run's* numbers were actually obtained — `"keyless"` (qualitative signals
> only; `volume`/`difficulty` stay `null`) or `"provider:openseo"` / `"provider:dataforseo"` (real
> numbers) — so a later run can refresh rather than re-pay for the same data. It can differ from
> `providerChoice`: a user who chose OpenSEO but whose OAuth didn't complete gets `source: "keyless"`
> for that run, with the reason reported.

## Rules
- The `business` profile is discovered from the site's real content, never invented. Populate it fully
  (valueProp/audience/brandVoice included) so a later run doesn't re-ask — and so GEO topic targeting
  and `Organization` schema have something real to work from.
- The `items` keys are **fixed** and mirror `checklist.md` one-for-one. Never add ad-hoc keys: anything
  in `items` that `scripts/weights.json` doesn't know about scores nothing, and `score.mjs` reports it
  as a warning rather than silently swallowing it.
- **Never store secrets here.** No API keys, tokens, passwords, or payment details — not in any block,
  not "temporarily". Credentials belong in the environment or the relevant provider's own store.
- The `deploy` block tracks **applied vs live**. `items` being `done` only means the change is in the
  codebase; until `liveVerifiedAt` is set by `/seo-live`, nothing has been proven in production and search
  engines may still see none of it. Keep `openFindings` populated while live issues remain unresolved.
- The `groundTruth` block is written by **`/seo-verify`** (`ground-truth.md`) and is what makes the
  convergence loop cheap on the second run. Three parts earn their keep:
  **`sources`** records what is connected and, for anything that isn't, *why* — so the next run
  doesn't re-attempt an OAuth the user declined, and so a missing source is never mistaken for a
  clean one. **`dismissed`** is the important one: an external false positive that isn't recorded
  comes back and costs the same investigation on every future run, so each entry stores the finding,
  the source, and the **evidence** that settled it. **`open`** carries what the user alone can fix
  (dashboard/CDN work) with the owner named, so it stays visible without being re-litigated.
  Never mark a finding `closed` on the strength of having applied a fix — `reverifiedAt` means the
  source was re-run afterwards and no longer reports it. Applied is not verified.
- The `watch` block is written by `/seo-watch` (`monitoring.md`) and is the **only** thing that command
  writes — it never edits the user's code. Its `history` gives each check a baseline to diff against, and
  `skipped` records what couldn't be checked (e.g. Search Console with no logged-in browser) so a gap is
  never mistaken for a pass.
- The `measurements.searchConsole` block is written by **`/seo-report`** (`reporting.md`) and is what
  makes month-over-month analysis possible. Every snapshot **must** carry `periodStart`, `periodEnd`
  and `source`: comparing two snapshots taken over different window lengths, or from different
  sources, is invalid, and without those fields a later run has no way to know. Keep ~12 entries in
  `history` so a **year-over-year** comparison — the only one that controls for seasonality — stays
  available. `ctr` is a fraction (0.033), not a percentage.
- The `measurements` block holds **externally produced numbers only** (`measurement.md`) — never the
  butler's own estimates. Whatever couldn't be measured goes in `unavailable` **with its reason**, so a
  later run shows an honest gap rather than a silent one. The top-level fields are the **latest**
  snapshot; before overwriting them, **push the old snapshot onto `history`** (append-only, keep the
  most recent ~10 and prune older to avoid unbounded growth). This is what lets a run show *movement*
  (e.g. "LCP 2.8s → 2.1s since 2026-07-15") instead of re-measuring from zero. Only compare like with
  like — same page, same `source`/`strategy`; never diff a lab number against a field number.
- On each run: read → treat `done`/`n/a` as settled → only re-open items whose scope changed
  (e.g. `pageCount` grew, new routes) or that are `partial`/`todo`.
- After applying, update every touched item's `status`, `date`, `scope`, `notes`, and append to
  `scoreHistory`.
- If nothing changed, still bump `lastRun` and report "Everything is current ✅".
- Store discovered `business` facts here so you don't ask again next time.
