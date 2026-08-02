#!/usr/bin/env node
/**
 * score.mjs - compute the SEO/GEO coverage score deterministically.
 *
 * The score card used to be arithmetic done by hand in the model's head, which meant the same
 * site could score differently on two runs. This script is the arithmetic. Weights live in
 * weights.json (single source of truth; scorecard.md documents the grouping and defers here).
 *
 *   done    -> full weight
 *   partial -> half weight
 *   todo / skipped / missing -> zero, but still counted in the denominator
 *   n/a     -> removed from the denominator entirely, then the rest renormalizes to 100
 *
 * Usage:
 *   node scripts/score.mjs
 *   node scripts/score.mjs --state ./.seo-butler/state.json
 *   node scripts/score.mjs --statuses '{"robots_txt":"done","titles":"partial"}'
 *   node scripts/score.mjs --json
 *
 * No dependencies. Node 18+.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * JSON.parse chokes on a UTF-8 BOM. Windows PowerShell's `Set-Content -Encoding utf8` writes one by
 * default, so a state.json touched by a script or an editor on Windows can arrive with a BOM through
 * no fault of the user. Strip it rather than crashing - the same class of bug validate-artifacts.mjs
 * exists to catch in sitemaps.
 */
function parseJson (text, what) {
  try {
    return JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  } catch (err) {
    throw new Error(`${what} is not valid JSON: ${err.message}`)
  }
}

function parseArgs (argv) {
  const args = { state: null, statuses: null, json: false, help: false, failUnder: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--state') args.state = argv[++i]
    else if (a === '--statuses') args.statuses = argv[++i]
    else if (a === '--fail-under') {
      const n = Number(argv[++i])
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        throw new Error('--fail-under needs a number between 0 and 100')
      }
      args.failUnder = n
    } else throw new Error(`Unknown argument: ${a}`)
  }
  return args
}

const USAGE = `
score.mjs - deterministic SEO/GEO coverage score

  --state <path>      state.json to read (default: ./.seo-butler/state.json)
  --statuses <json>   score an inline {"item":"status"} map instead of a state file
  --json              machine-readable output
  --fail-under <n>    exit 1 if the score is below n (0-100). For CI gates.
  --help              this message
`.trim()

/** Flatten weights.json groups into a single item -> {weight, group} map. */
function flattenWeights (spec) {
  const flat = {}
  for (const [groupKey, group] of Object.entries(spec.groups)) {
    for (const [item, weight] of Object.entries(group.items)) {
      if (flat[item]) throw new Error(`weights.json: item "${item}" appears in two groups`)
      flat[item] = { weight, group: groupKey, groupLabel: group.label }
    }
  }
  return flat
}

function score (statuses, spec) {
  const flat = flattenWeights(spec)
  const credit = spec.statusCredit

  let earned = 0
  let denominator = 0
  const perItem = []
  const notApplicable = []
  const unscored = []

  // Sort keys so output is byte-stable across runs.
  for (const item of Object.keys(flat).sort()) {
    const { weight, group, groupLabel } = flat[item]
    const status = statuses[item] ?? 'todo'

    if (!(status in credit)) {
      throw new Error(`Item "${item}" has unknown status "${status}". Valid: ${Object.keys(credit).join(', ')}`)
    }

    const factor = credit[status]
    if (factor === null) { // n/a - leaves the denominator
      notApplicable.push({ item, group, groupLabel, status })
      continue
    }

    denominator += weight
    earned += weight * factor
    perItem.push({ item, group, groupLabel, status, weight, earned: weight * factor })
  }

  // Anything present in state but unknown to weights.json - surfaces drift instead of hiding it.
  for (const item of Object.keys(statuses).sort()) {
    if (!flat[item]) unscored.push({ item, status: statuses[item] })
  }

  const normalized = denominator === 0 ? 0 : Math.round((earned / denominator) * 100)

  return {
    score: normalized,
    earnedWeight: Number(earned.toFixed(2)),
    denominatorWeight: Number(denominator.toFixed(2)),
    totalWeightDefined: Number(
      Object.values(flat).reduce((s, x) => s + x.weight, 0).toFixed(2)
    ),
    counts: {
      done: perItem.filter(x => x.status === 'done').length,
      partial: perItem.filter(x => x.status === 'partial').length,
      todo: perItem.filter(x => x.status === 'todo').length,
      skipped: perItem.filter(x => x.status === 'skipped').length,
      notApplicable: notApplicable.length
    },
    items: perItem,
    notApplicable,
    unscored
  }
}

function render (result) {
  const lines = []
  lines.push(`Coverage score: ${result.score}/100`)
  lines.push(
    `  ${result.earnedWeight} of ${result.denominatorWeight} applicable weight ` +
    `(${result.totalWeightDefined} defined; n/a items removed, remainder renormalized to 100)`
  )
  lines.push('')
  const c = result.counts
  lines.push(`  done ${c.done} · partial ${c.partial} · todo ${c.todo} · skipped ${c.skipped} · n/a ${c.notApplicable}`)

  const gaps = result.items.filter(x => x.status !== 'done')
  if (gaps.length) {
    lines.push('')
    lines.push('Not fully done (highest weight first):')
    for (const g of [...gaps].sort((a, b) => b.weight - a.weight || a.item.localeCompare(b.item))) {
      lines.push(`  ${String(g.weight).padStart(4)}  ${g.item.padEnd(28)} ${g.status}`)
    }
  }

  if (result.notApplicable.length) {
    lines.push('')
    lines.push(`n/a (excluded from the denominator): ${result.notApplicable.map(x => x.item).join(', ')}`)
  }

  if (result.unscored.length) {
    lines.push('')
    lines.push('WARNING - items in state.json with no weight in weights.json (they scored nothing):')
    for (const u of result.unscored) lines.push(`  ${u.item} (${u.status})`)
  }

  return lines.join('\n')
}

function main () {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err.message)
    console.error(USAGE)
    process.exit(2)
  }

  if (args.help) { console.log(USAGE); return }

  let spec, statuses
  try {
    spec = parseJson(readFileSync(resolve(HERE, 'weights.json'), 'utf8'), 'weights.json')
  } catch (err) {
    console.error(err.message)
    process.exit(2)
  }

  if (args.statuses) {
    try {
      statuses = parseJson(args.statuses, '--statuses')
    } catch (err) {
      console.error(err.message)
      process.exit(2)
    }
  } else {
    const statePath = resolve(process.cwd(), args.state ?? '.seo-butler/state.json')
    let raw
    try {
      raw = readFileSync(statePath, 'utf8')
    } catch {
      console.error(`No state file at ${statePath}`)
      console.error('Run /seo first, or pass --state / --statuses.')
      process.exit(2)
    }
    let state
    try {
      state = parseJson(raw, statePath)
    } catch (err) {
      console.error(err.message)
      process.exit(2)
    }
    statuses = Object.fromEntries(
      Object.entries(state.items ?? {}).map(([k, v]) => [k, v?.status ?? 'todo'])
    )
  }

  let result
  try {
    result = score(statuses, spec)
  } catch (err) {
    console.error(err.message)
    process.exit(2)
  }

  if (args.json) console.log(JSON.stringify(result, null, 2))
  else console.log(render(result))

  if (args.failUnder !== null && result.score < args.failUnder) {
    console.error(`\nScore ${result.score} is below the --fail-under threshold of ${args.failUnder}.`)
    process.exit(1)
  }
}

main()
