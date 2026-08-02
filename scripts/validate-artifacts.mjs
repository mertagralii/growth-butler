#!/usr/bin/env node
/**
 * validate-artifacts.mjs - deterministic checks on the SEO artifacts the butler produces.
 *
 * This is the layer that must be true regardless of what any model believes. Three of the checks
 * here exist because a build passed and static file reads looked fine while the deployed site was
 * broken anyway:
 *
 *   - a template engine HTML-encoded the JSON-LD script type, shipping `application/ld&#x2B;json`,
 *     which no parser recognises;
 *   - sitemap.xml shipped with a UTF-8 BOM, which makes strict XML parsers reject the whole file;
 *   - a link crawl found 404s on pages a sitemap-driven audit never fetched, because the pages that
 *     accumulate broken links (login, register, password reset) are noindex and therefore not listed.
 *
 * None is visible unless you look at the raw bytes of the response — and the third is not visible
 * unless you follow the links outward. That is what this does.
 *
 * Usage:
 *   node scripts/validate-artifacts.mjs --url https://example.com
 *   node scripts/validate-artifacts.mjs --root . --public public
 *   node scripts/validate-artifacts.mjs --url https://example.com --root .   # also diffs robots.txt
 *   node scripts/validate-artifacts.mjs --url https://example.com --pages /,/pricing,/blog --json
 *
 * Output is stable across runs (no timestamps, sorted keys) so two runs on an unchanged site
 * produce byte-identical output.
 *
 * No dependencies. Node 18+ (uses global fetch).
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

// The last three are the commonly-missed ones: GoogleOther is Google's separate non-Search crawler
// (AI Overviews eligibility), Bytespider is ByteDance's, and CCBot feeds Common Crawl, which a large
// share of models train and retrieve from. A catch-all `User-agent: *` block sweeps them up without
// anyone intending it.
const AI_BOTS = [
  'Bytespider',
  'CCBot',
  'ClaudeBot',
  'GPTBot',
  'Google-Extended',
  'GoogleOther',
  'OAI-SearchBot',
  'PerplexityBot',
  'Bingbot'
]

const PUBLIC_DIR_CANDIDATES = ['public', 'static', 'wwwroot', 'dist', 'build', '_site', 'web', 'assets']

// standards.md: titles aim 50-60 (hard cap ~60); meta descriptions aim 140-160 (hard cap ~160).
const TITLE_MAX = 60
const TITLE_MIN = 15
const DESC_MAX = 160
const DESC_MIN = 50

const USAGE = `
validate-artifacts.mjs - deterministic SEO artifact checks

  --url <origin>     live site to check (e.g. https://example.com)
  --root <dir>       project root, for checking files as they exist in the repo
  --public <dir>     public/static dir inside --root (auto-detected if omitted)
  --pages <list>     comma-separated paths to check (default: /)
  --max-links <n>    cap on internal URLs the link crawl visits (default 150)
  --link-depth <n>   how many hops out from the seed pages to follow (default 2)
  --no-links         skip the link-integrity crawl entirely
  --json             machine-readable output
  --strict           exit 1 when any check fails
  --help             this message

At least one of --url or --root is required. Passing both also diffs the repo's robots.txt
against the live one, which is how an edge/CDN override gets caught.

The link crawl starts from --pages plus every URL in the sitemap, and follows internal links
outward. That is deliberate: the pages that break most often (login, register, password reset)
are noindex, so they are absent from the sitemap and invisible to a sitemap-only check.

Git Bash on Windows rewrites arguments that start with "/" into Windows paths, so --pages /,/about
arrives mangled. Prefix the command with MSYS_NO_PATHCONV=1, or use PowerShell/cmd, where it works
as written.
`.trim()

function parseArgs (argv) {
  const args = {
    url: null, root: null, public: null, pages: ['/'], json: false, strict: false, help: false,
    links: true, maxLinks: 150, linkDepth: 2
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--strict') args.strict = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--no-links') args.links = false
    else if (a === '--url') args.url = argv[++i]
    else if (a === '--root') args.root = argv[++i]
    else if (a === '--public') args.public = argv[++i]
    else if (a === '--pages') args.pages = argv[++i].split(',').map(s => s.trim()).filter(Boolean)
    else if (a === '--max-links') args.maxLinks = Number(argv[++i])
    else if (a === '--link-depth') args.linkDepth = Number(argv[++i])
    else throw new Error(`Unknown argument: ${a}`)
  }
  if (!Number.isFinite(args.maxLinks) || args.maxLinks < 1) throw new Error('--max-links must be a positive number')
  if (!Number.isFinite(args.linkDepth) || args.linkDepth < 0) throw new Error('--link-depth must be 0 or greater')
  return args
}

// ---------------------------------------------------------------- fetching

/** Fetch raw bytes + decoded text. Never throws; failures come back as a result object. */
async function fetchRaw (url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'seo-butler/2.1 (+validate-artifacts)' } })
    const buf = Buffer.from(await res.arrayBuffer())
    return { ok: res.ok, status: res.status, bytes: buf, text: buf.toString('utf8'), url: res.url }
  } catch (err) {
    return { ok: false, status: 0, bytes: null, text: null, error: String(err.message ?? err) }
  }
}

/**
 * One request, HEAD first because it is cheap, GET when the server rejects the method. Plenty of
 * stacks answer HEAD with 405/501/403 while the page itself is fine, and calling that a broken link
 * would be a false alarm.
 */
async function probe (url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'manual',
        headers: { 'user-agent': 'seo-butler/2.1 (+validate-artifacts)' }
      })
      if (method === 'HEAD' && [403, 405, 501].includes(res.status)) continue
      return res
    } catch (err) {
      if (method === 'GET') return { networkError: String(err.message ?? err) }
    }
  }
  return { networkError: 'no response' }
}

/**
 * Status probe that follows redirects *manually* so the hop count survives. `redirect: 'follow'`
 * hides the chain, and the chain is half the finding: `A -> B -> C` wastes crawl budget, and a
 * redirect that lands on an error page is what Google reads as a soft 404.
 */
async function fetchStatus (url, maxHops = 5) {
  const chain = []
  let current = url

  for (let hop = 0; hop <= maxHops; hop++) {
    const res = await probe(current)
    if (res.networkError) return { ok: false, status: 0, error: res.networkError, url: current, chain }

    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!location) return { ok: res.ok, status: res.status, url: current, chain }

    chain.push({ from: current, status: res.status })
    try {
      current = new URL(location, current).toString()
    } catch {
      return { ok: false, status: res.status, error: `unparseable Location: ${location}`, url: current, chain }
    }
  }
  return { ok: false, status: 0, error: `more than ${maxHops} redirects`, url: current, chain }
}

/** Bounded-concurrency map. Keeps the crawl polite without serialising it. */
async function mapPool (items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

function readLocal (path) {
  try {
    if (!existsSync(path)) return { ok: false, status: 404, bytes: null, text: null }
    const buf = readFileSync(path)
    return { ok: true, status: 200, bytes: buf, text: buf.toString('utf8') }
  } catch (err) {
    return { ok: false, status: 0, bytes: null, text: null, error: String(err.message ?? err) }
  }
}

function detectPublicDir (root, explicit) {
  if (explicit) return resolve(root, explicit)
  for (const c of PUBLIC_DIR_CANDIDATES) {
    if (existsSync(join(root, c))) return join(root, c)
  }
  return root
}

// ---------------------------------------------------------------- parsing helpers

function hasBom (bytes) {
  return !!bytes && bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
}

function stripBom (text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * Minimal robots.txt parser. Groups consecutive User-agent lines with the rules that follow,
 * which is what the spec actually says and what naive line-by-line readers get wrong.
 */
function parseRobots (text) {
  const groups = []
  const sitemaps = []
  let current = null
  let lastWasAgent = false

  for (const rawLine of stripBom(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value)
      lastWasAgent = true
    } else if (field === 'sitemap') {
      sitemaps.push(value)
    } else if (current && (field === 'disallow' || field === 'allow')) {
      current.rules.push({ type: field, path: value })
      lastWasAgent = false
    } else {
      lastWasAgent = false
    }
  }
  return { groups, sitemaps }
}

/** The group that applies to `agent`: exact (case-insensitive) match wins, else the `*` group. */
function groupFor (parsed, agent) {
  const lower = agent.toLowerCase()
  const exact = parsed.groups.find(g => g.agents.some(a => a.toLowerCase() === lower))
  if (exact) return exact
  return parsed.groups.find(g => g.agents.includes('*')) ?? null
}

function blocksEverything (group) {
  if (!group) return false
  const blanket = group.rules.some(r => r.type === 'disallow' && (r.path === '/' || r.path === '/*'))
  if (!blanket) return false
  // An `Allow: /` in the same group overrides a blanket disallow for most crawlers.
  const allowsRoot = group.rules.some(r => r.type === 'allow' && (r.path === '/' || r.path === '/*'))
  return !allowsRoot
}

/**
 * Structural XML check for the sitemap subset. Not a full parser - it verifies tag balance and
 * nesting, which is what catches truncated writes and unclosed tags.
 */
function xmlStructureError (text) {
  const body = stripBom(text)
  const stack = []
  const tagRe = /<\s*(\/?)\s*([A-Za-z_][\w.:-]*)([^>]*?)(\/?)\s*>/g
  const withoutSpecials = body
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
    .replace(/<![\s\S]*?>/g, '')

  let m
  while ((m = tagRe.exec(withoutSpecials)) !== null) {
    const [, closing, name, , selfClose] = m
    if (selfClose) continue
    if (closing) {
      if (stack.length === 0) return `unexpected closing tag </${name}>`
      const open = stack.pop()
      if (open !== name) return `tag mismatch: <${open}> closed by </${name}>`
    } else {
      stack.push(name)
    }
  }
  if (stack.length) return `unclosed tag <${stack[stack.length - 1]}>`
  return null
}

function countMatches (text, re) {
  const m = text.match(re)
  return m ? m.length : 0
}

function attr (tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')
  const m = tag.match(re)
  return m ? (m[2] ?? m[3] ?? '') : null
}

function metaContent (html, matcher) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? []
  for (const tag of tags) {
    if (matcher(tag)) return attr(tag, 'content')
  }
  return null
}

function metaByName (html, name) {
  return metaContent(html, tag => (attr(tag, 'name') ?? '').toLowerCase() === name.toLowerCase())
}

function metaByProperty (html, prop) {
  return metaContent(html, tag => (attr(tag, 'property') ?? '').toLowerCase() === prop.toLowerCase())
}

// ---------------------------------------------------------------- check plumbing

function makeReporter () {
  const checks = []
  const add = (id, item, checklist, status, detail) =>
    checks.push({ id, item, checklist, status, detail })
  return { checks, add }
}

// ---------------------------------------------------------------- checks

/**
 * Not finding a file in the public dir is NOT proof the artifact is missing. ASP.NET, Django,
 * Rails, Laravel and Spring routinely serve robots.txt and sitemap.xml from a *route* — there is
 * no static file to find, and the site is perfectly correct. Only the live response settles it,
 * so a repo-only run reports uncertainty instead of inventing a failure.
 */
function missingInRepo (add, id, item, checklist, name, live) {
  if (live && live.ok) {
    add(id, item, checklist, 'pass',
      `No static ${name} in the public dir, but the live site serves it — generated dynamically by ` +
      'a route. Correct for server-rendered stacks.')
  } else if (live) {
    add(id, item, checklist, 'fail',
      `No ${name} in the public dir, and the live site doesn't serve one either ` +
      `(HTTP ${live.status}). Genuinely missing.`)
  } else {
    add(id, item, checklist, 'skip',
      `No static ${name} in the public dir. Not a failure on its own — many stacks generate it from ` +
      'a route. Re-run with --url to settle it.')
  }
}

function checkRobots (add, source, robots, live) {
  const label = source === 'live' ? 'live' : 'repo'

  if (!robots.ok) {
    if (source === 'repo') {
      missingInRepo(add, `robots.${source}.present`, 'robots_txt', 1, 'robots.txt', live)
    } else {
      add(`robots.${source}.present`, 'robots_txt', 1, 'fail',
        `No robots.txt (${label}, HTTP ${robots.status}). Crawlers get no sitemap pointer.`)
    }
    return null
  }
  add(`robots.${source}.present`, 'robots_txt', 1, 'pass', `robots.txt found (${label}).`)

  const parsed = parseRobots(robots.text)

  const starGroup = parsed.groups.find(g => g.agents.includes('*')) ?? null
  if (blocksEverything(starGroup)) {
    add(`robots.${source}.blanket-disallow`, 'robots_txt', 1, 'fail',
      `"User-agent: *" is followed by "Disallow: /" (${label}). The whole site is blocked from crawling. ` +
      'This is the single most common cause of a site vanishing from search.')
  } else {
    add(`robots.${source}.blanket-disallow`, 'robots_txt', 1, 'pass',
      `No site-wide Disallow for "*" (${label}).`)
  }

  if (parsed.sitemaps.length === 0) {
    add(`robots.${source}.sitemap-directive`, 'robots_txt', 1, 'fail',
      `No "Sitemap:" line in robots.txt (${label}).`)
  } else {
    const relative = parsed.sitemaps.filter(s => !/^https?:\/\//i.test(s))
    if (relative.length) {
      add(`robots.${source}.sitemap-directive`, 'robots_txt', 1, 'warn',
        `Sitemap directive must be an absolute URL; found: ${relative.sort().join(', ')}`)
    } else {
      add(`robots.${source}.sitemap-directive`, 'robots_txt', 1, 'pass',
        `Sitemap declared: ${parsed.sitemaps.slice().sort().join(', ')}`)
    }
  }

  const blocked = AI_BOTS.filter(bot => blocksEverything(groupFor(parsed, bot))).sort()
  if (blocked.length) {
    add(`robots.${source}.ai-bots`, 'ai_crawlability', 17, 'fail',
      `AI citation bots blocked (${label}): ${blocked.join(', ')}. ` +
      'These are the crawlers that feed ChatGPT / Claude / Perplexity / AI Overviews (geo.md Tier 1). ' +
      'Only correct if the user deliberately opted out.')
  } else {
    add(`robots.${source}.ai-bots`, 'ai_crawlability', 17, 'pass',
      `All AI citation bots allowed (${label}): ${AI_BOTS.slice().sort().join(', ')}`)
  }

  return parsed
}

function checkSitemap (add, source, sitemap, live) {
  const label = source === 'live' ? 'live' : 'repo'

  if (!sitemap.ok) {
    if (source === 'repo') {
      missingInRepo(add, `sitemap.${source}.present`, 'sitemap_xml', 2, 'sitemap.xml', live)
    } else {
      add(`sitemap.${source}.present`, 'sitemap_xml', 2, 'fail',
        `No sitemap.xml (${label}, HTTP ${sitemap.status}).`)
    }
    return
  }
  add(`sitemap.${source}.present`, 'sitemap_xml', 2, 'pass', `sitemap.xml found (${label}).`)

  // The BOM check. A UTF-8 BOM makes strict XML parsers reject the whole document, and it is
  // invisible in an editor and in `cat`. Found in the field; this is why it is checked on bytes.
  if (hasBom(sitemap.bytes)) {
    add(`sitemap.${source}.bom`, 'sitemap_xml', 2, 'fail',
      `sitemap.xml starts with a UTF-8 BOM (EF BB BF) (${label}). Strict XML parsers reject the file ` +
      'outright. Write it without a BOM.')
  } else {
    add(`sitemap.${source}.bom`, 'sitemap_xml', 2, 'pass', `No BOM (${label}).`)
  }

  const structureError = xmlStructureError(sitemap.text)
  if (structureError) {
    add(`sitemap.${source}.structure`, 'sitemap_xml', 2, 'fail',
      `sitemap.xml is not well-formed (${label}): ${structureError}`)
    return
  }
  add(`sitemap.${source}.structure`, 'sitemap_xml', 2, 'pass', `Tag structure is balanced (${label}).`)

  const body = stripBom(sitemap.text)
  const isIndex = /<\s*sitemapindex[\s>]/i.test(body)
  const locCount = countMatches(body, /<\s*loc\s*>/gi)
  const lastmodCount = countMatches(body, /<\s*lastmod\s*>/gi)

  if (locCount === 0) {
    add(`sitemap.${source}.urls`, 'sitemap_xml', 2, 'fail', `sitemap.xml contains no <loc> entries (${label}).`)
  } else {
    add(`sitemap.${source}.urls`, 'sitemap_xml', 2, 'pass',
      `${locCount} <loc> ${isIndex ? 'sitemap references' : 'URLs'} (${label}).`)
  }

  if (!isIndex && locCount > 0 && lastmodCount === 0) {
    add(`sitemap.${source}.lastmod`, 'sitemap_xml', 2, 'warn',
      `No <lastmod> on any URL (${label}). Valid, but it costs crawl-efficiency signal.`)
  } else if (!isIndex && locCount > 0) {
    add(`sitemap.${source}.lastmod`, 'sitemap_xml', 2, 'pass', `${lastmodCount}/${locCount} URLs carry <lastmod> (${label}).`)
  }
}

function checkJsonLd (add, page, html) {
  // The encoding check. Some template engines HTML-escape attribute values, turning
  // `application/ld+json` into `application/ld&#x2B;json`. The page renders, the JSON is there,
  // and no consumer recognises the block. Only the raw response shows it.
  const encodedForms = ['ld&#x2b;json', 'ld&#43;json', 'ld&plus;json', 'ld%2bjson']
  const lower = html.toLowerCase()
  const foundEncoded = encodedForms.filter(f => lower.includes(f)).sort()

  if (foundEncoded.length) {
    add(`page[${page}].jsonld.encoding`, 'structured_data', 9, 'fail',
      `JSON-LD script type is HTML-encoded in the served response (${foundEncoded.join(', ')}). ` +
      'The "+" must reach the browser literally as `application/ld+json` or nothing consumes the block. ' +
      'This survives a passing build - it is a template-escaping bug, not a syntax error.')
    return
  }

  const blocks = [...html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi
  )]

  if (blocks.length === 0) {
    add(`page[${page}].jsonld.present`, 'structured_data', 9, 'fail',
      'No `application/ld+json` block. Organization + WebSite are the documented minimum.')
    return
  }

  const types = []
  let invalid = 0
  blocks.forEach((m, i) => {
    try {
      const parsed = JSON.parse(m[1].trim())
      const collect = node => {
        if (Array.isArray(node)) return node.forEach(collect)
        if (node && typeof node === 'object') {
          if (node['@type']) types.push(...[node['@type']].flat())
          if (node['@graph']) collect(node['@graph'])
        }
      }
      collect(parsed)
    } catch (err) {
      invalid++
      add(`page[${page}].jsonld.parse[${i}]`, 'structured_data', 9, 'fail',
        `JSON-LD block ${i + 1} is not valid JSON: ${err.message}`)
    }
  })

  if (invalid === 0) {
    const unique = [...new Set(types)].sort()
    add(`page[${page}].jsonld.parse`, 'structured_data', 9, 'pass',
      `${blocks.length} JSON-LD block(s), all valid JSON. @type: ${unique.length ? unique.join(', ') : '(none declared)'}`)

    for (const required of ['Organization', 'WebSite']) {
      const has = unique.some(t => t === required || (required === 'Organization' && t === 'LocalBusiness'))
      add(`page[${page}].jsonld.${required.toLowerCase()}`, 'structured_data', 9, has ? 'pass' : 'warn',
        has ? `${required} present.` : `${required} missing (standards.md lists it as always-on).`)
    }
  }
}

// ---------------------------------------------------------------- link integrity (item 13)

/** Schemes that are not navigable URLs, plus in-page anchors. None of these can be "broken". */
const NON_NAVIGABLE = /^(mailto:|tel:|sms:|javascript:|data:|blob:|ftp:|#)/i

function extractHrefs (html) {
  const out = []
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, 'href')
    if (href && href.trim()) out.push(href.trim())
  }
  return out
}

/** Resolve `href` against `base`, drop the fragment. Returns null for anything not worth fetching. */
function absolutize (href, base) {
  if (NON_NAVIGABLE.test(href)) return null
  try {
    const u = new URL(href, base)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    u.hash = ''
    return u.toString()
  } catch {
    return null
  }
}

function shortenUrl (url, origin) {
  return url.startsWith(origin) ? (url.slice(origin.length) || '/') : url
}

/**
 * Breadth-first internal link check.
 *
 * This exists because the per-page audit only proves that *the pages it was handed* are alive. It
 * says nothing about the links inside them, and the pages that break most often — login, register,
 * password reset — are `noindex`, so they are not in the sitemap and a sitemap-driven check never
 * looks at them. Following links outward is the only way those get seen.
 */
async function checkLinks (add, origin, seeds, { maxLinks, linkDepth }) {
  let baseOrigin
  try {
    baseOrigin = new URL(origin).origin
  } catch {
    return
  }

  const visited = new Map()            // absolute url -> status result
  const referrers = new Map()          // absolute url -> Set of pages that link to it
  let frontier = [...new Set(seeds.map(s => absolutize(s, origin)).filter(Boolean))]
  const enqueued = new Set(frontier)
  let dropped = 0

  for (let depth = 0; depth <= linkDepth && frontier.length; depth++) {
    const room = maxLinks - visited.size
    if (room <= 0) {
      dropped += frontier.length
      break
    }
    if (frontier.length > room) {
      dropped += frontier.length - room
      frontier = frontier.slice(0, room)
    }

    const isLeaf = depth === linkDepth
    const next = []

    const batch = await mapPool(frontier, 6, async url =>
      isLeaf ? { url, res: await fetchStatus(url) } : { url, res: await fetchRaw(url) })

    for (const { url, res } of batch) {
      visited.set(url, res)
      if (isLeaf || !res.ok || !res.text) continue
      if (!/^\s*<(!doctype|html)/i.test(res.text.slice(0, 200).trim())) continue

      for (const href of extractHrefs(res.text)) {
        const abs = absolutize(href, res.url || url)
        if (!abs || new URL(abs).origin !== baseOrigin) continue
        if (!referrers.has(abs)) referrers.set(abs, new Set())
        referrers.get(abs).add(shortenUrl(url, baseOrigin))
        if (!enqueued.has(abs)) {
          enqueued.add(abs)
          next.push(abs)
        }
      }
    }
    frontier = next
  }

  // Sorted so two runs on an unchanged site produce byte-identical output.
  const entries = [...visited.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const broken = entries.filter(([, r]) => r.status >= 400 && r.status < 600)
  const unreachable = entries.filter(([, r]) => r.status === 0)
  const chains = entries.filter(([, r]) => (r.chain?.length ?? 0) > 1)

  for (const [url, res] of broken) {
    const path = shortenUrl(url, baseOrigin)
    const from = [...(referrers.get(url) ?? [])].sort()
    const linkedFrom = from.length
      ? `Linked from ${from.length} page(s): ${from.slice(0, 5).join(', ')}${from.length > 5 ? ` (+${from.length - 5} more)` : ''}.`
      : 'Reached from the sitemap or the requested page list, not from a link.'

    // Cloudflare's Email Obfuscation rewrites every `mailto:` into this path at the edge and restores
    // it with JavaScript on click. The repo is not wrong — the markup the crawler receives is. Saying
    // "fix your link" here would send the user hunting through source that is already correct.
    if (/\/cdn-cgi\/l\/email-protection/i.test(url)) {
      add(`links.broken[${path}]`, 'broken_links', 13, 'fail',
        `HTTP ${res.status}. This is Cloudflare Email Obfuscation (Scrape Shield), not a link you wrote: ` +
        'it replaces `mailto:` hrefs with this path and restores them via JavaScript. Crawlers without JS ' +
        'get a 404 and never see the address, so your contact email is invisible to search and AI bots ' +
        `(checklist item 35). The switch is in the Cloudflare dashboard, not the repo. ${linkedFrom}`)
      continue
    }

    add(`links.broken[${path}]`, 'broken_links', 13, 'fail',
      `HTTP ${res.status}${res.error ? ` - ${res.error}` : ''}. ${linkedFrom}`)
  }

  for (const [url, res] of unreachable) {
    add(`links.unreachable[${shortenUrl(url, baseOrigin)}]`, 'broken_links', 13, 'warn',
      `No response (${res.error ?? 'unknown'}). Could be the target or could be this machine's network - ` +
      'not counted as broken.')
  }

  for (const [url, res] of chains) {
    const hops = res.chain.map(h => h.status).join(' -> ')
    add(`links.redirect-chain[${shortenUrl(url, baseOrigin)}]`, 'broken_links', 13, 'warn',
      `${res.chain.length} redirect hops (${hops}) before HTTP ${res.status}. checklist.md item 13 allows ` +
      'one hop; each extra hop wastes crawl budget, and a chain ending on an error page reads as a soft 404.')
  }

  if (broken.length === 0) {
    add('links.broken', 'broken_links', 13, 'pass',
      `${visited.size} internal URL(s) checked, none broken.`)
  }

  // No silent caps: if the crawl stopped short, the report says so rather than implying full coverage.
  add('links.coverage', null, null, 'info',
    `Link crawl: ${visited.size} internal URL(s) visited, depth ${linkDepth}, cap ${maxLinks}.` +
    (dropped > 0
      ? ` ${dropped} queued URL(s) NOT checked - the cap was hit. Raise --max-links for full coverage.`
      : ' Cap not reached.') +
    ' External links are not checked here (report-only per checklist item 13). Redirect chains are ' +
    'counted only at the outermost depth, where links are probed rather than followed - a chain on a ' +
    'page the crawl descended through will not be reported.')
}

function checkPage (add, page, res) {
  if (!res.ok) {
    add(`page[${page}].reachable`, 'broken_links', 13, 'fail',
      `HTTP ${res.status}${res.error ? ` - ${res.error}` : ''}`)
    return
  }
  const html = res.text

  // title
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : null
  if (!title) {
    add(`page[${page}].title`, 'titles', 3, 'fail', 'No <title>.')
  } else if (title.length > TITLE_MAX) {
    add(`page[${page}].title`, 'titles', 3, 'warn',
      `<title> is ${title.length} chars (cap ~${TITLE_MAX}); Google will truncate it.`)
  } else if (title.length < TITLE_MIN) {
    add(`page[${page}].title`, 'titles', 3, 'warn', `<title> is only ${title.length} chars - likely too thin.`)
  } else {
    add(`page[${page}].title`, 'titles', 3, 'pass', `<title> ${title.length} chars.`)
  }

  // meta description
  const desc = metaByName(html, 'description')
  if (!desc) {
    add(`page[${page}].description`, 'meta_description', 4, 'fail', 'No meta description.')
  } else if (desc.length > DESC_MAX) {
    add(`page[${page}].description`, 'meta_description', 4, 'warn',
      `Meta description is ${desc.length} chars (cap ~${DESC_MAX}).`)
  } else if (desc.length < DESC_MIN) {
    add(`page[${page}].description`, 'meta_description', 4, 'warn',
      `Meta description is only ${desc.length} chars - likely too thin.`)
  } else {
    add(`page[${page}].description`, 'meta_description', 4, 'pass', `Meta description ${desc.length} chars.`)
  }

  // canonical
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? []
  const canonicals = linkTags
    .filter(t => (attr(t, 'rel') ?? '').toLowerCase() === 'canonical')
    .map(t => attr(t, 'href'))
    .filter(Boolean)
  if (canonicals.length === 0) {
    add(`page[${page}].canonical`, 'canonical', 5, 'fail', 'No rel=canonical.')
  } else if (canonicals.length > 1) {
    add(`page[${page}].canonical`, 'canonical', 5, 'fail',
      `${canonicals.length} conflicting rel=canonical tags: ${canonicals.slice().sort().join(', ')}`)
  } else if (!/^https?:\/\//i.test(canonicals[0])) {
    add(`page[${page}].canonical`, 'canonical', 5, 'warn',
      `Canonical is relative ("${canonicals[0]}"); standards.md requires an absolute URL.`)
  } else {
    add(`page[${page}].canonical`, 'canonical', 5, 'pass', `Canonical: ${canonicals[0]}`)
  }

  // meta robots / noindex hygiene
  const robotsMeta = metaByName(html, 'robots')
  if (robotsMeta && /noindex/i.test(robotsMeta)) {
    add(`page[${page}].noindex`, 'robots_hygiene', 11, 'fail',
      `Page declares <meta name="robots" content="${robotsMeta}">. If this page is meant to rank, ` +
      'that single tag removes it from search.')
  } else {
    add(`page[${page}].noindex`, 'robots_hygiene', 11, 'pass',
      robotsMeta ? `meta robots: ${robotsMeta}` : 'No meta robots restriction.')
  }

  // Open Graph
  const ogMissing = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
    .filter(p => !metaByProperty(html, p))
  if (ogMissing.length) {
    add(`page[${page}].opengraph`, 'open_graph', 7, ogMissing.length === 5 ? 'fail' : 'warn',
      `Missing Open Graph tags: ${ogMissing.join(', ')}`)
  } else {
    add(`page[${page}].opengraph`, 'open_graph', 7, 'pass', 'All five core Open Graph tags present.')
  }

  // Twitter card
  const card = metaByName(html, 'twitter:card')
  if (!card) {
    add(`page[${page}].twittercard`, 'twitter_card', 8, 'warn', 'No twitter:card.')
  } else if (card.trim() !== 'summary_large_image') {
    add(`page[${page}].twittercard`, 'twitter_card', 8, 'warn',
      `twitter:card is "${card}"; standards.md specifies summary_large_image.`)
  } else {
    add(`page[${page}].twittercard`, 'twitter_card', 8, 'pass', 'twitter:card = summary_large_image.')
  }

  // html lang
  const htmlTag = html.match(/<html\b[^>]*>/i)
  const lang = htmlTag ? attr(htmlTag[0], 'lang') : null
  add(`page[${page}].htmllang`, 'html_lang', 31, lang ? 'pass' : 'fail',
    lang ? `<html lang="${lang}">` : 'No lang attribute on <html>.')

  // Mixed content: one http:// SUBRESOURCE on an https:// page breaks the padlock and the browser
  // blocks the resource outright. Only meaningful when the page itself was served over https.
  //
  // Subresources only — things the browser fetches to build the page. An `<a href="http://…">` is an
  // ordinary outbound link: not blocked, not mixed content, and flagging it would be a false alarm.
  // So `href` counts on <link> but never on <a>.
  if (res.url && res.url.startsWith('https://')) {
    const SUBRESOURCE_ATTRS = {
      link: ['href'],
      script: ['src'],
      img: ['src', 'srcset'],
      iframe: ['src'],
      source: ['src', 'srcset'],
      video: ['src', 'poster'],
      audio: ['src'],
      embed: ['src'],
      object: ['data'],
      track: ['src'],
      input: ['src'],
      form: ['action']
    }
    const insecure = new Set()
    for (const tag of html.match(/<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/g) ?? []) {
      const name = tag.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/)?.[1]?.toLowerCase()
      for (const a of SUBRESOURCE_ATTRS[name] ?? []) {
        const val = attr(tag, a)
        if (!val) continue
        // srcset holds a comma-separated candidate list: "a.png 1x, b.png 2x"
        for (const part of a === 'srcset' ? val.split(',') : [val]) {
          const url = part.trim().split(/\s+/)[0]
          if (/^http:\/\//i.test(url)) insecure.add(url)
        }
      }
    }
    const sorted = [...insecure].sort()
    if (sorted.length) {
      add(`page[${page}].mixedcontent`, 'robots_hygiene', 11, 'fail',
        `${sorted.length} insecure subresource(s) on an HTTPS page: ${sorted.slice(0, 3).join(', ')}` +
        (sorted.length > 3 ? ` (+${sorted.length - 3} more)` : '') +
        '. Browsers block these and the padlock breaks.')
    } else {
      add(`page[${page}].mixedcontent`, 'robots_hygiene', 11, 'pass', 'No mixed content.')
    }
  }

  // exactly one h1
  const h1Count = countMatches(html, /<h1\b[^>]*>/gi)
  if (h1Count === 1) {
    add(`page[${page}].h1`, 'semantic_html', 19, 'pass', 'Exactly one <h1>.')
  } else {
    add(`page[${page}].h1`, 'semantic_html', 19, h1Count === 0 ? 'fail' : 'warn',
      h1Count === 0 ? 'No <h1>.' : `${h1Count} <h1> elements; there should be one.`)
  }

  // Heading order: descending one level at a time. A jump like h2 -> h5 breaks the document outline,
  // and it is invisible on screen because heading level and visual size are styled independently —
  // which is exactly why it survives a run that "fixed the headings" and gets caught by an auditor.
  const levels = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map(m => Number(m[1]))
  if (levels.length === 0) {
    add(`page[${page}].heading-order`, 'semantic_html', 19, 'warn', 'No headings at all on the page.')
  } else {
    const skips = []
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i - 1] + 1) skips.push(`h${levels[i - 1]} -> h${levels[i]}`)
    }
    if (skips.length) {
      add(`page[${page}].heading-order`, 'semantic_html', 19, 'warn',
        `${skips.length} skipped heading level(s): ${[...new Set(skips)].sort().join(', ')}. ` +
        `Order on the page: ${levels.map(l => `h${l}`).join(' ')}.`)
    } else {
      add(`page[${page}].heading-order`, 'semantic_html', 19, 'pass',
        `${levels.length} heading(s), no skipped levels.`)
    }
  }

  checkJsonLd(add, page, html)
}

// ---------------------------------------------------------------- main

async function run (args) {
  const { add, checks } = makeReporter()

  // Fetch both sides BEFORE judging either. A repo artifact that looks missing may simply be
  // served from a route, and only the live response can tell the difference — so the repo verdict
  // has to know the live result before it is written.
  const repo = { robots: null, sitemap: null, llms: null }
  const live = { robots: null, sitemap: null, llms: null }
  let origin = null

  if (args.root) {
    const root = resolve(process.cwd(), args.root)
    const publicDir = detectPublicDir(root, args.public)
    add('source.repo', null, null, 'info', `Repo public dir: ${publicDir}`)
    repo.robots = readLocal(join(publicDir, 'robots.txt'))
    repo.sitemap = readLocal(join(publicDir, 'sitemap.xml'))
    repo.llms = readLocal(join(publicDir, 'llms.txt'))
  }

  if (args.url) {
    origin = args.url.replace(/\/+$/, '')
    add('source.live', null, null, 'info', `Live origin: ${origin}`)
    live.robots = await fetchRaw(`${origin}/robots.txt`)
    live.sitemap = await fetchRaw(`${origin}/sitemap.xml`)
    live.llms = await fetchRaw(`${origin}/llms.txt`)
  }

  if (args.root) {
    checkRobots(add, 'repo', repo.robots, live.robots)
    checkSitemap(add, 'repo', repo.sitemap, live.sitemap)

    if (repo.llms.ok) {
      add('llms.repo', 'llms_txt', 22, 'pass', 'llms.txt present.')
    } else if (live.llms && live.llms.ok) {
      add('llms.repo', 'llms_txt', 22, 'pass',
        'No static llms.txt, but the live site serves it — generated dynamically by a route.')
    } else {
      add('llms.repo', 'llms_txt', 22, 'warn',
        'No llms.txt. Cheap to add, but genuinely minor - no major AI engine officially consumes it as of 2026.')
    }
  }

  if (args.url) {
    checkRobots(add, 'live', live.robots, null)
    checkSitemap(add, 'live', live.sitemap, null)

    add('llms.live', 'llms_txt', 22, live.llms.ok ? 'pass' : 'warn',
      live.llms.ok ? 'llms.txt served.' : `No llms.txt (HTTP ${live.llms.status}).`)

    for (const page of args.pages) {
      const path = page.startsWith('/') ? page : `/${page}`
      checkPage(add, path, await fetchRaw(`${origin}${path}`))
    }

    if (args.links) {
      // Seed from the requested pages AND the sitemap. The sitemap alone is not enough (noindex pages
      // are deliberately absent from it), and the requested pages alone are not enough (they are
      // usually just "/"), so the union is what gives the crawl somewhere real to start.
      const sitemapLocs = live.sitemap?.ok
        ? [...stripBom(live.sitemap.text).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1])
        : []
      const seeds = [
        ...args.pages.map(p => `${origin}${p.startsWith('/') ? p : `/${p}`}`),
        ...sitemapLocs
      ]
      await checkLinks(add, origin, seeds, { maxLinks: args.maxLinks, linkDepth: args.linkDepth })
    }
  }

  // Edge/CDN override: the repo says one thing, the edge serves another.
  if (repo.robots && live.robots) {
    if (!repo.robots.ok || !live.robots.ok) {
      add('robots.edge-diff', 'edge_robots_check', 14, 'skip',
        !repo.robots.ok && live.robots.ok
          ? 'No static robots.txt to diff against — it is generated by a route, so an edge override ' +
            'cannot be detected by comparing files. Compare the live output against the route by hand.'
          : 'Cannot compare robots.txt - one side is missing.')
    } else {
      const norm = t => stripBom(t).split(/\r?\n/).map(l => l.trim()).filter(Boolean).join('\n')
      if (norm(repo.robots.text) === norm(live.robots.text)) {
        add('robots.edge-diff', 'edge_robots_check', 14, 'pass', 'Live robots.txt matches the repo - no edge override.')
      } else {
        add('robots.edge-diff', 'edge_robots_check', 14, 'fail',
          'Live robots.txt differs from the repo. A CDN/WAF/host is shadowing the origin file, so ' +
          'editing the repo will not fix it - the change belongs in the provider dashboard (cdn-layer.md).')
      }
    }
  }

  const summary = { pass: 0, fail: 0, warn: 0, skip: 0, info: 0 }
  for (const c of checks) summary[c.status]++

  return { summary, checks }
}

function render (result) {
  const icon = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'SKIP', info: '····' }
  const lines = []
  for (const c of result.checks) {
    lines.push(`${icon[c.status]}  ${c.id}`)
    lines.push(`      ${c.detail}`)
  }
  const s = result.summary
  lines.push('')
  lines.push(`${s.pass} passed · ${s.fail} failed · ${s.warn} warnings · ${s.skip} skipped`)
  return lines.join('\n')
}

async function main () {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    console.error(USAGE)
    process.exit(2)
  }

  if (args.help) { console.log(USAGE); return }

  if (!args.url && !args.root) {
    console.error('Need at least one of --url or --root.')
    console.error(USAGE)
    process.exit(2)
  }

  const result = await run(args)

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else console.log(render(result))

  if (args.strict && result.summary.fail > 0) process.exit(1)
}

main()
