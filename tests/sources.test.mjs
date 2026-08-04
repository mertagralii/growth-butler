/**
 * The fourth seam: checklist.md <-> sources.md.
 *
 * sources.md maps checklist items to the official documentation that settles them. Nothing at
 * runtime enforces that mapping, and both ways it can rot are silent:
 *
 *   - renumber the checklist and the registry keeps citing the old numbers, so a specialist reads
 *     the snippet guidelines while working on canonicals and nobody sees an error;
 *   - add a specialist, or drop the `?hl=en` off a Google URL while tidying, and the fetch quietly
 *     starts returning a page in whatever language the host guesses from the runner's IP.
 *
 * Both were observed while building the registry, which is why they are asserted rather than trusted.
 * These tests never fetch: the repo's test layer is dependency-free and offline, and a network
 * assertion would make CI fail for reasons that have nothing to do with the commit. Whether a URL
 * still resolves is a maintenance question, answered by re-fetching the registry by hand.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO } from './helpers/run.mjs'

const REFERENCES = join(REPO, 'skills', 'seo-butler', 'references')

const SOURCES = readFileSync(join(REFERENCES, 'sources.md'), 'utf8')
const CHECKLIST = readFileSync(join(REFERENCES, 'checklist.md'), 'utf8')
const SKILL = readFileSync(join(REPO, 'skills', 'seo-butler', 'SKILL.md'), 'utf8')
const STANDARDS = readFileSync(join(REFERENCES, 'standards.md'), 'utf8')
const GEO = readFileSync(join(REFERENCES, 'geo.md'), 'utf8')

/** Table rows are `| items | what it settles | url |`. Separator and header rows are skipped. */
function tableRows () {
  return SOURCES.split('\n')
    .filter(l => l.startsWith('|'))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()))
    .filter(cells => cells.length === 3 && !/^-+$/.test(cells[0]) && cells[0] !== 'Items')
}

/** Every checklist item number a registry row claims to cover. `all` covers nothing specific. */
function citedItems () {
  const nums = new Set()
  for (const [items] of tableRows()) {
    // en dash for ranges (26–28), comma for lists (1, 17)
    for (const part of items.split(',')) {
      const range = part.trim().match(/^(\d+)[–-](\d+)$/)
      if (range) {
        for (let n = Number(range[1]); n <= Number(range[2]); n++) nums.add(n)
      } else if (/^\d+$/.test(part.trim())) {
        nums.add(Number(part.trim()))
      }
    }
  }
  return [...nums].sort((a, b) => a - b)
}

const urls = [...SOURCES.matchAll(/https?:\/\/[^\s|)]+/g)].map(m => m[0])

describe('canonical source registry', () => {
  test('every cited item is a real checklist item', () => {
    const checklistItems = [...CHECKLIST.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]))
    const strays = citedItems().filter(n => !checklistItems.includes(n))
    assert.deepEqual(strays, [],
      'sources.md points specialists at checklist items that do not exist - renumbering drift')
  })

  test('every specialist has sources', () => {
    // A specialist with no row reads nothing official and works from memory, which is the exact
    // failure this file exists to remove.
    for (const agent of ['seo-technical', 'seo-geo-content', 'seo-performance',
      'seo-accessibility', 'seo-analytics']) {
      assert.ok(SOURCES.includes(agent), `sources.md names no sources for ${agent}`)
    }
  })

  test('every source URL is absolute https', () => {
    assert.ok(urls.length >= 30, `expected the registry to carry real sources, found ${urls.length}`)
    const insecure = urls.filter(u => !u.startsWith('https://'))
    assert.deepEqual(insecure, [])
  })

  test('no source URL is registered twice', () => {
    const seen = new Set()
    const dupes = urls.filter(u => (seen.has(u) ? true : (seen.add(u), false)))
    assert.deepEqual(dupes, [], 'a duplicated row means two items silently share one fetch budget')
  })

  test('Google-hosted docs pin the language with hl=en', () => {
    // These hosts geo-redirect: fetched bare, the robots.txt spec came back in Polish and Web Vitals
    // in Hindi. Without the parameter the agent fetches a page it may not be able to read, and the
    // result depends on where the run happens.
    const googleHosts = /^https:\/\/(developers\.google\.com|web\.dev|support\.google\.com)\//
    const unpinned = urls.filter(u => googleHosts.test(u) && !u.includes('hl=en'))
    assert.deepEqual(unpinned, [], 'these will return a locale chosen by the runner\'s IP')
  })

  test('every section marker points at a section that exists', () => {
    // standards.md and geo.md carry `sources.md § X` markers instead of repeating the URLs, so the
    // two copies cannot drift. The cost is a pointer that can dangle: relabel a section here and the
    // marker sends the reader nowhere, silently.
    const sections = new Set([...SOURCES.matchAll(/^## ([A-Z]) ·/gm)].map(m => m[1]))
    assert.ok(sections.size >= 5, `sources.md should carry lettered sections, found ${sections.size}`)

    for (const [file, text] of [['standards.md', STANDARDS], ['geo.md', GEO]]) {
      const referenced = [...text.matchAll(/`sources\.md` §+ ([A-Z])/g)].map(m => m[1])
      assert.ok(referenced.length > 0, `${file} carries no source markers at all`)
      const dangling = [...new Set(referenced)].filter(s => !sections.has(s))
      assert.deepEqual(dangling, [], `${file} points at sections sources.md does not have`)
    }
  })

  test('the pinned references do not repeat the URLs', () => {
    // The registry is the single source of truth for addresses, the same discipline scorecard.md
    // applies to weights.json. A second copy is a copy that goes stale without anyone noticing.
    for (const [file, text] of [['standards.md', STANDARDS], ['geo.md', GEO]]) {
      const copied = urls.filter(u => text.includes(u))
      assert.deepEqual(copied, [], `${file} duplicates registry URLs - it should carry markers only`)
    }
  })

  test('the skill loads the registry', () => {
    // A reference file the skill never names is one no run will ever read.
    assert.ok(SKILL.includes('references/sources.md'),
      'SKILL.md must list sources.md, or specialists never learn it exists')
  })
})
