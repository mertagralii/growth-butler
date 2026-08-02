/**
 * The three-way seam: checklist.md <-> state-schema.md <-> weights.json.
 *
 * These are kept in step by hand. Nothing enforces it, and the failure is silent in the worst way:
 * add an item to the checklist and the schema but forget weights.json, and the butler dutifully
 * audits it, writes it to state, and scores it as nothing - while the score card still reads as a
 * complete picture. score.mjs reports that drift at runtime (`unscored`), but only for the state
 * file in front of it, which means it can only warn the user after the gap already shipped.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO, SCRIPTS } from './helpers/run.mjs'

const REFERENCES = join(REPO, 'skills', 'seo-butler', 'references')

const WEIGHTS = JSON.parse(readFileSync(join(SCRIPTS, 'weights.json'), 'utf8'))
const CHECKLIST = readFileSync(join(REFERENCES, 'checklist.md'), 'utf8')
const SCHEMA_MD = readFileSync(join(REFERENCES, 'state-schema.md'), 'utf8')

/** Pull the `"items": { … }` object out of the example state.json documented in state-schema.md. */
function schemaItems () {
  const anchor = SCHEMA_MD.indexOf('"items": {')
  assert.notEqual(anchor, -1, 'state-schema.md no longer documents an "items" block')

  const open = SCHEMA_MD.indexOf('{', anchor)
  let depth = 0
  for (let i = open; i < SCHEMA_MD.length; i++) {
    if (SCHEMA_MD[i] === '{') depth++
    else if (SCHEMA_MD[i] === '}' && --depth === 0) {
      return JSON.parse(SCHEMA_MD.slice(open, i + 1))
    }
  }
  throw new Error('unbalanced braces in the state-schema.md items block')
}

const weightItems = Object.values(WEIGHTS.groups).flatMap(g => Object.keys(g.items))

describe('checklist / state schema / weights stay in step', () => {
  test('every weighted item is documented in state-schema.md', () => {
    const documented = Object.keys(schemaItems())
    const missing = weightItems.filter(k => !documented.includes(k))
    assert.deepEqual(missing, [], 'weights.json scores items the schema never tells the butler to write')
  })

  test('every documented item carries a weight', () => {
    const documented = Object.keys(schemaItems())
    const unweighted = documented.filter(k => !weightItems.includes(k))
    assert.deepEqual(unweighted, [],
      'these items get audited and stored but score nothing - exactly the bug weights.json v2 fixed')
  })

  test('no item is weighted twice', () => {
    // score.mjs throws on this, but only when someone happens to run it.
    const seen = new Set()
    const duplicated = weightItems.filter(k => (seen.has(k) ? true : (seen.add(k), false)))
    assert.deepEqual(duplicated, [])
  })

  test('each group weight equals the sum of its items', () => {
    // scorecard.md prints the group labels and their weights. If a member weight is edited without
    // the group total, the score is still right and the card that explains it is wrong.
    for (const [key, group] of Object.entries(WEIGHTS.groups)) {
      const sum = Object.values(group.items).reduce((a, b) => a + b, 0)
      assert.ok(Math.abs(sum - group.weight) < 1e-9,
        `group "${key}" declares weight ${group.weight} but its items sum to ${sum}`)
    }
  })

  test('the checklist is still the fixed 35 items every doc promises', () => {
    // "Fixed" is the load-bearing claim: on a re-run the butler re-checks the same items and never
    // invents new ones. Growing the list is allowed - silently growing it is not, because SKILL.md,
    // seo.md, the score card and the README all quote the number.
    const numbers = [...CHECKLIST.matchAll(/^(\d+)\. /gm)].map(m => Number(m[1]))
    assert.deepEqual(numbers, Array.from({ length: 35 }, (_, i) => i + 1),
      'checklist.md must number 1-35 with no gaps and no repeats')
    assert.equal(Object.keys(schemaItems()).length, 35, 'one state key per checklist item')
    assert.equal(weightItems.length, 35, 'one weight per checklist item')
  })

  test('statusCredit covers exactly the statuses the checklist defines', () => {
    assert.deepEqual(
      Object.keys(WEIGHTS.statusCredit).sort(),
      ['done', 'n/a', 'partial', 'skipped', 'todo']
    )
    assert.equal(WEIGHTS.statusCredit['n/a'], null, 'n/a must leave the denominator, not score zero')
  })
})
