#!/usr/bin/env node
/**
 * triage-external.mjs - turn outside auditors' reports into an actionable, de-duplicated worklist.
 *
 * The butler scores itself. That is useful and repeatable, but self-verification agrees with itself
 * by construction, so it cannot find the thing it forgot to check. Outside crawlers can - and in the
 * field they did. They also produce false positives, and blindly "closing" those damages a site that
 * was already correct. Both failures are real:
 *
 *   - OpenSEO flags a missing meta description on pages it has itself just reported as `noindex`,
 *     where a description is never displayed anywhere;
 *   - geodaddy reports JSON-LD as missing `@type` when it uses the root `@graph` pattern, which is
 *     canonical schema.org and correct;
 *   - and both, correctly, found broken links that the butler's own audit had missed entirely.
 *
 * So an external finding is EVIDENCE, not a verdict. This script does the deterministic part of the
 * adjudication - mapping each finding onto the fixed checklist, suppressing the disagreements that
 * have been measured and reproduced, and marking what two independent sources agree on. What is left
 * needs judgement, and is handed back labelled rather than silently decided.
 *
 * Usage:
 *   node scripts/triage-external.mjs --openseo issues.json --geodaddy report.json
 *   node scripts/triage-external.mjs --openseo - --lighthouse lhr.json   # one report from stdin
 *   node scripts/triage-external.mjs --openseo i.json --json --fail-on-act
 *
 * Accepts what the tools actually emit: OpenSEO's `{summary, issues}` object or a bare issues array,
 * geodaddy's `{pages:[{results:[…]}]}` report, and a Lighthouse LHR (bare, or wrapped in `{lhr}`).
 *
 * No dependencies. Node 18+. Output is sorted, so two runs on the same input are byte-identical.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

const USAGE = `
triage-external.mjs - adjudicate outside auditors' findings against the fixed checklist

  --openseo <file|->    OpenSEO get_audit_issues output (JSON)
  --geodaddy <file|->   geodaddy analyze_url output (JSON)
  --lighthouse <file|-> Lighthouse report (LHR JSON, from chrome-devtools MCP or lighthouse --output=json)
  --json                machine-readable output
  --fail-on-act         exit 1 while any "act" finding remains (for the convergence loop)
  --help                this message

At least one input is required. "-" reads that report from stdin (only one input can use it).
`.trim()

const VERDICT_ORDER = { act: 0, edge: 1, verify: 2, informational: 3 }

const VERDICT_LABEL = {
  act: 'ACT',
  edge: 'EDGE',
  verify: 'VERIFY',
  informational: 'INFO'
}

function parseArgs (argv) {
  const args = { openseo: null, geodaddy: null, lighthouse: null, json: false, failOnAct: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--fail-on-act') args.failOnAct = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--openseo') args.openseo = argv[++i]
    else if (a === '--geodaddy') args.geodaddy = argv[++i]
    else if (a === '--lighthouse') args.lighthouse = argv[++i]
    else throw new Error(`Unknown argument: ${a}`)
  }
  return args
}

function readInput (spec) {
  const raw = spec === '-' ? readFileSync(0, 'utf8') : readFileSync(spec, 'utf8')
  try {
    return JSON.parse(raw.replace(/^﻿/, ''))
  } catch (err) {
    throw new Error(`${spec === '-' ? 'stdin' : spec} is not valid JSON: ${err.message}`)
  }
}

function shortUrl (url) {
  try {
    const u = new URL(url)
    return (u.pathname + u.search) || '/'
  } catch {
    return url
  }
}

// ---------------------------------------------------------------- normalising the two shapes

/** OpenSEO: `{summary, issues}` or a bare array. `issue` and `title` are both seen in the wild. */
function normalizeOpenSeo (doc) {
  const issues = Array.isArray(doc) ? doc : (doc.issues ?? [])
  return issues.map(i => ({
    source: 'openseo',
    code: i.issueType,
    severity: i.severity ?? 'warning',
    url: i.url ?? null,
    targetUrl: i.details?.targetUrl ?? null,
    message: i.title ?? i.issue ?? i.issueType,
    howToFix: i.howToFix ?? null,
    details: i.details ?? null
  }))
}

/**
 * geodaddy: only `fail` and `warn` are findings. A `pass` is not a worklist item, and carrying it
 * through would inflate the count with things that are already right.
 */
function normalizeGeodaddy (doc) {
  const out = []
  for (const page of doc.pages ?? []) {
    for (const r of page.results ?? []) {
      if (r.status === 'pass') continue
      out.push({
        source: 'geodaddy',
        code: r.check,
        severity: r.status === 'fail' ? 'critical' : 'warning',
        url: page.url ?? doc.url ?? null,
        targetUrl: null,
        message: r.message ?? r.check,
        howToFix: r.recommendation || null,
        details: null
      })
    }
  }
  return out
}

/**
 * Lighthouse (LHR). Only scored audits are findings.
 *
 * `manual`, `notApplicable` and `informative` audits carry `score: null` — they were never judged,
 * so treating them as failures would manufacture work out of "not checked". Same trap as geodaddy's
 * "requires site-wide crawl mode": a coverage statement is not a defect.
 */
function normalizeLighthouse (doc) {
  const lhr = doc.lhr ?? doc
  const url = lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl ?? null
  const out = []

  for (const [id, audit] of Object.entries(lhr.audits ?? {})) {
    if (['manual', 'notApplicable', 'informative'].includes(audit.scoreDisplayMode)) continue
    if (audit.score === null || audit.score === undefined || audit.score >= 1) continue
    out.push({
      source: 'lighthouse',
      code: id,
      severity: audit.score === 0 ? 'critical' : 'warning',
      url,
      targetUrl: null,
      message: audit.title ?? id,
      howToFix: audit.description ?? null,
      details: audit.displayValue ? { displayValue: audit.displayValue } : null
    })
  }
  return out
}

// ---------------------------------------------------------------- adjudication

function adjudicate (findings, map) {
  // OpenSEO tells us which URLs are noindex. That is exactly what decides whether a missing meta
  // description matters, so use its own output to answer its own finding instead of asking the user.
  const noindexUrls = new Set(
    findings.filter(f => f.code === 'noindex-page' && f.url).map(f => f.url)
  )

  return findings.map(f => {
    const rule = map[f.source]?.[f.code] ?? null
    let verdict = rule?.verdict ?? 'verify'
    let item = rule?.item ?? null
    const reasons = []

    if (!rule) reasons.push(`No mapping for "${f.code}" - unrecognised issue type, judge it manually.`)
    if (rule?.note) reasons.push(rule.note)
    if (rule?.falsePositive) reasons.push(`KNOWN FALSE POSITIVE: ${rule.falsePositive}`)

    // A URL the edge injected is not a URL the repo can fix.
    const candidate = f.targetUrl ?? f.url ?? ''
    for (const pattern of map.urlPatterns ?? []) {
      if (candidate.includes(pattern.match)) {
        verdict = pattern.verdict
        item = pattern.item
        reasons.push(pattern.note)
      }
    }

    if (rule?.suppressWhenNoindex && f.url && noindexUrls.has(f.url)) {
      verdict = 'informational'
      reasons.push(
        'Suppressed: the same audit reports this URL as noindex, and a meta description is never ' +
        'shown for a page that is not indexed. Not a defect.'
      )
    }

    return { ...f, item, verdict, reasons, subjectIsUrl: rule?.subjectIsUrl === true }
  })
}

/**
 * Group by (checklist item + the thing that is actually broken), so eight findings about one dead
 * URL become one job. Two sources landing on the same group is corroboration - it means neither is
 * hallucinating, and that is worth knowing before spending effort.
 */
function group (adjudicated) {
  const groups = new Map()

  for (const f of adjudicated) {
    // A dead page and the links pointing at it are one job, so they must land on one subject.
    const subject = f.targetUrl
      ? shortUrl(f.targetUrl)
      : f.subjectIsUrl && f.url
        ? shortUrl(f.url)
        : (f.item ? `item-${f.item}` : f.code)
    const key = `${f.verdict}|${f.item ?? '?'}|${subject}`

    if (!groups.has(key)) {
      groups.set(key, {
        verdict: f.verdict,
        item: f.item,
        subject,
        codes: new Set(),
        sources: new Set(),
        severities: new Set(),
        urls: new Set(),
        messages: new Set(),
        reasons: new Set(),
        howToFix: f.howToFix
      })
    }
    const g = groups.get(key)
    g.codes.add(f.code)
    g.sources.add(f.source)
    g.severities.add(f.severity)
    // When the URL *is* the subject, listing it again as an affected page reads as double-counting.
    if (f.url && !f.subjectIsUrl) g.urls.add(shortUrl(f.url))
    g.messages.add(f.message)
    f.reasons.forEach(r => g.reasons.add(r))
    if (!g.howToFix && f.howToFix) g.howToFix = f.howToFix
  }

  return [...groups.values()]
    .map(g => ({
      verdict: g.verdict,
      item: g.item,
      subject: g.subject,
      codes: [...g.codes].sort(),
      sources: [...g.sources].sort(),
      corroborated: g.sources.size > 1,
      severity: ['critical', 'warning', 'info'].find(s => g.severities.has(s)) ?? 'warning',
      affectedUrls: [...g.urls].sort(),
      messages: [...g.messages].sort(),
      reasons: [...g.reasons],
      howToFix: g.howToFix
    }))
    .sort((a, b) =>
      VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
      b.affectedUrls.length - a.affectedUrls.length ||
      (a.item ?? 99) - (b.item ?? 99) ||
      (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0))
}

function render (groups, sources) {
  const lines = []
  const counts = { act: 0, edge: 0, verify: 0, informational: 0 }
  for (const g of groups) counts[g.verdict]++

  lines.push(`Sources: ${sources.join(' + ')}`)
  lines.push(`${groups.length} distinct finding(s): ` +
    `${counts.act} to fix · ${counts.edge} at the edge · ${counts.verify} to verify · ` +
    `${counts.informational} not a defect`)
  lines.push('')

  let lastVerdict = null
  for (const g of groups) {
    if (g.verdict !== lastVerdict) {
      lines.push(`--- ${VERDICT_LABEL[g.verdict]} ---`)
      lastVerdict = g.verdict
    }
    const item = g.item ? `item ${g.item}` : 'unmapped'
    const corro = g.corroborated ? `  [corroborated by ${g.sources.join(' + ')}]` : ''
    lines.push(`${VERDICT_LABEL[g.verdict].padEnd(6)} ${g.subject}  (${item}, ${g.severity})${corro}`)
    lines.push(`       ${[...g.messages].join(' | ')}`)
    if (g.affectedUrls.length) {
      const shown = g.affectedUrls.slice(0, 5).join(', ')
      const more = g.affectedUrls.length > 5 ? ` (+${g.affectedUrls.length - 5} more)` : ''
      lines.push(`       on ${g.affectedUrls.length} page(s): ${shown}${more}`)
    }
    for (const r of g.reasons) lines.push(`       ${r}`)
    lines.push('')
  }

  if (counts.act === 0) {
    lines.push('No "act" findings remain. The convergence loop can stop on this evidence -')
    lines.push('state that the sources are clean, not that the site is perfect.')
  }
  return lines.join('\n')
}

function main () {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    console.error('')
    console.error(USAGE)
    process.exit(2)
  }

  if (args.help || (!args.openseo && !args.geodaddy && !args.lighthouse)) {
    console.log(USAGE)
    process.exit(args.help ? 0 : 2)
  }

  let map
  try {
    map = JSON.parse(readFileSync(join(HERE, 'external-issues.json'), 'utf8'))
  } catch (err) {
    console.error(`Cannot read external-issues.json: ${err.message}`)
    process.exit(2)
  }

  const findings = []
  const sources = []
  try {
    if (args.openseo) {
      findings.push(...normalizeOpenSeo(readInput(args.openseo)))
      sources.push('openseo')
    }
    if (args.geodaddy) {
      findings.push(...normalizeGeodaddy(readInput(args.geodaddy)))
      sources.push('geodaddy')
    }
    if (args.lighthouse) {
      findings.push(...normalizeLighthouse(readInput(args.lighthouse)))
      sources.push('lighthouse')
    }
  } catch (err) {
    console.error(err.message)
    process.exit(2)
  }

  const groups = group(adjudicate(findings, map))
  const actCount = groups.filter(g => g.verdict === 'act').length

  if (args.json) {
    console.log(JSON.stringify({
      sources,
      rawFindings: findings.length,
      groups,
      summary: {
        act: actCount,
        edge: groups.filter(g => g.verdict === 'edge').length,
        verify: groups.filter(g => g.verdict === 'verify').length,
        informational: groups.filter(g => g.verdict === 'informational').length
      }
    }, null, 2))
  } else {
    console.log(render(groups, sources))
  }

  process.exit(args.failOnAct && actCount > 0 ? 1 : 0)
}

main()
