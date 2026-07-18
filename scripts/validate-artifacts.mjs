#!/usr/bin/env node
/**
 * validate-artifacts.mjs - deterministic checks on the SEO artifacts the butler produces.
 *
 * This is the layer that must be true regardless of what any model believes. Two of the checks
 * here exist because a build passed and static file reads looked fine while the deployed site was
 * broken anyway:
 *
 *   - a template engine HTML-encoded the JSON-LD script type, shipping `application/ld&#x2B;json`,
 *     which no parser recognises;
 *   - sitemap.xml shipped with a UTF-8 BOM, which makes strict XML parsers reject the whole file.
 *
 * Neither is visible unless you look at the raw bytes of the response. That is what this does.
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

const AI_BOTS = [
  'ClaudeBot',
  'GPTBot',
  'Google-Extended',
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
  --json             machine-readable output
  --strict           exit 1 when any check fails
  --help             this message

At least one of --url or --root is required. Passing both also diffs the repo's robots.txt
against the live one, which is how an edge/CDN override gets caught.

Git Bash on Windows rewrites arguments that start with "/" into Windows paths, so --pages /,/about
arrives mangled. Prefix the command with MSYS_NO_PATHCONV=1, or use PowerShell/cmd, where it works
as written.
`.trim()

function parseArgs (argv) {
  const args = { url: null, root: null, public: null, pages: ['/'], json: false, strict: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--strict') args.strict = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--url') args.url = argv[++i]
    else if (a === '--root') args.root = argv[++i]
    else if (a === '--public') args.public = argv[++i]
    else if (a === '--pages') args.pages = argv[++i].split(',').map(s => s.trim()).filter(Boolean)
    else throw new Error(`Unknown argument: ${a}`)
  }
  return args
}

// ---------------------------------------------------------------- fetching

/** Fetch raw bytes + decoded text. Never throws; failures come back as a result object. */
async function fetchRaw (url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'seo-butler/2.0 (+validate-artifacts)' } })
    const buf = Buffer.from(await res.arrayBuffer())
    return { ok: res.ok, status: res.status, bytes: buf, text: buf.toString('utf8'), url: res.url }
  } catch (err) {
    return { ok: false, status: 0, bytes: null, text: null, error: String(err.message ?? err) }
  }
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

function checkRobots (add, source, robots) {
  const label = source === 'live' ? 'live' : 'repo'

  if (!robots.ok) {
    add(`robots.${source}.present`, 'robots_txt', 1, 'fail',
      `No robots.txt (${label}, HTTP ${robots.status}). Crawlers get no sitemap pointer.`)
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

function checkSitemap (add, source, sitemap) {
  const label = source === 'live' ? 'live' : 'repo'

  if (!sitemap.ok) {
    add(`sitemap.${source}.present`, 'sitemap_xml', 2, 'fail',
      `No sitemap.xml (${label}, HTTP ${sitemap.status}).`)
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

  // exactly one h1
  const h1Count = countMatches(html, /<h1\b[^>]*>/gi)
  if (h1Count === 1) {
    add(`page[${page}].h1`, 'semantic_html', 19, 'pass', 'Exactly one <h1>.')
  } else {
    add(`page[${page}].h1`, 'semantic_html', 19, h1Count === 0 ? 'fail' : 'warn',
      h1Count === 0 ? 'No <h1>.' : `${h1Count} <h1> elements; there should be one.`)
  }

  checkJsonLd(add, page, html)
}

// ---------------------------------------------------------------- main

async function run (args) {
  const { add, checks } = makeReporter()

  let repoRobots = null
  let liveRobots = null

  if (args.root) {
    const root = resolve(process.cwd(), args.root)
    const publicDir = detectPublicDir(root, args.public)
    add('source.repo', null, null, 'info', `Repo public dir: ${publicDir}`)

    repoRobots = readLocal(join(publicDir, 'robots.txt'))
    checkRobots(add, 'repo', repoRobots)
    checkSitemap(add, 'repo', readLocal(join(publicDir, 'sitemap.xml')))

    const llms = readLocal(join(publicDir, 'llms.txt'))
    add('llms.repo', 'llms_txt', 22, llms.ok ? 'pass' : 'warn',
      llms.ok
        ? 'llms.txt present.'
        : 'No llms.txt. Cheap to add, but genuinely minor - no major AI engine officially consumes it as of 2026.')
  }

  if (args.url) {
    const origin = args.url.replace(/\/+$/, '')
    add('source.live', null, null, 'info', `Live origin: ${origin}`)

    liveRobots = await fetchRaw(`${origin}/robots.txt`)
    checkRobots(add, 'live', liveRobots)
    checkSitemap(add, 'live', await fetchRaw(`${origin}/sitemap.xml`))

    const llms = await fetchRaw(`${origin}/llms.txt`)
    add('llms.live', 'llms_txt', 22, llms.ok ? 'pass' : 'warn',
      llms.ok ? 'llms.txt served.' : `No llms.txt (HTTP ${llms.status}).`)

    for (const page of args.pages) {
      const path = page.startsWith('/') ? page : `/${page}`
      checkPage(add, path, await fetchRaw(`${origin}${path}`))
    }
  }

  // Edge/CDN override: the repo says one thing, the edge serves another.
  if (repoRobots && liveRobots) {
    if (!repoRobots.ok || !liveRobots.ok) {
      add('robots.edge-diff', 'edge_robots_check', 14, 'skip',
        'Cannot compare robots.txt - one side is missing.')
    } else {
      const norm = t => stripBom(t).split(/\r?\n/).map(l => l.trim()).filter(Boolean).join('\n')
      if (norm(repoRobots.text) === norm(liveRobots.text)) {
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
