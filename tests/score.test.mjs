/**
 * score.mjs - the arithmetic behind the score card.
 *
 * This exists because the score used to be done in the model's head, which meant the same site could
 * score differently on two runs. Moving it into a script fixed the variance but not the correctness:
 * a mistake in the renormalization would still be deterministic, still be confident, and still be
 * wrong, with nothing to compare it against. These tests are that comparison.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run, runJson, SCRIPTS } from './helpers/run.mjs'

const WEIGHTS = JSON.parse(readFileSync(join(SCRIPTS, 'weights.json'), 'utf8'))

/** Flat item -> weight map, mirroring score.mjs's own flattenWeights. */
const FLAT = Object.fromEntries(
  Object.values(WEIGHTS.groups).flatMap(g => Object.entries(g.items))
)
const TOTAL = Object.values(FLAT).reduce((a, b) => a + b, 0)

function allOf (status) {
  return Object.fromEntries(Object.keys(FLAT).map(k => [k, status]))
}

function score (statuses, extraArgs = []) {
  const r = runJson('score.mjs', ['--statuses', JSON.stringify(statuses), ...extraArgs])
  assert.equal(r.code, 0, `expected exit 0, got ${r.code}\n${r.stderr}`)
  assert.ok(r.json, `stdout was not JSON:\n${r.stdout}`)
  return r.json
}

describe('score.mjs', () => {
  test('a fully done site scores 100', () => {
    const result = score(allOf('done'))
    assert.equal(result.score, 100)
    assert.equal(result.denominatorWeight, TOTAL)
    assert.equal(result.earnedWeight, TOTAL)
  })

  test('an untouched site scores 0 but keeps every item in the denominator', () => {
    const result = score(allOf('todo'))
    assert.equal(result.score, 0)
    assert.equal(result.denominatorWeight, TOTAL)
    assert.equal(result.counts.todo, Object.keys(FLAT).length)
  })

  test('n/a leaves the denominator and the rest renormalizes to 100', () => {
    // hreflang is the real-world case: single-language sites can never earn it, so charging them
    // for it would cap every monolingual site below 100 forever.
    const result = score({ ...allOf('done'), hreflang: 'n/a' })

    assert.equal(result.score, 100, 'a site that did everything applicable to it scores 100')
    assert.equal(result.denominatorWeight, TOTAL - FLAT.hreflang)
    assert.equal(result.totalWeightDefined, TOTAL, 'the defined total is reported unchanged')
    assert.deepEqual(result.notApplicable.map(x => x.item), ['hreflang'])
    assert.equal(result.counts.notApplicable, 1)
  })

  test('skipped and todo stay in the denominator - only n/a leaves it', () => {
    const skipped = score({ ...allOf('done'), robots_txt: 'skipped' })
    const notApplicable = score({ ...allOf('done'), robots_txt: 'n/a' })

    assert.equal(skipped.denominatorWeight, TOTAL, 'skipping is a choice, and it costs')
    assert.equal(notApplicable.denominatorWeight, TOTAL - FLAT.robots_txt)
    assert.equal(notApplicable.score, 100)
    assert.ok(skipped.score < 100, 'a skipped item must not score like a done one')
  })

  test('partial earns exactly half the weight', () => {
    const result = score({ ...allOf('todo'), structured_data: 'partial' })
    assert.equal(result.earnedWeight, FLAT.structured_data / 2)
    assert.equal(result.counts.partial, 1)
  })

  test('an unknown status is refused, not silently scored as zero', () => {
    const r = run('score.mjs', ['--statuses', JSON.stringify({ robots_txt: 'mostly-done' })])
    assert.equal(r.code, 2)
    assert.match(r.stderr, /unknown status "mostly-done"/i)
  })

  test('an item with no weight is surfaced as drift, not swallowed', () => {
    // If a checklist item is added to state.json but nobody updates weights.json, the score would
    // quietly ignore it. That must be loud.
    const result = score({ ...allOf('done'), brand_new_check: 'done' })
    assert.deepEqual(result.unscored, [{ item: 'brand_new_check', status: 'done' }])

    const text = run('score.mjs', ['--statuses', JSON.stringify({ brand_new_check: 'done' })])
    assert.match(text.stdout, /WARNING/)
    assert.match(text.stdout, /brand_new_check/)
  })

  describe('--fail-under (the CI gate)', () => {
    test('exits 1 below the threshold', () => {
      const r = run('score.mjs', ['--statuses', JSON.stringify(allOf('todo')), '--fail-under', '1'])
      assert.equal(r.code, 1)
      assert.match(r.stderr, /below the --fail-under threshold/)
    })

    test('exits 0 at the threshold', () => {
      const r = run('score.mjs', ['--statuses', JSON.stringify(allOf('done')), '--fail-under', '100'])
      assert.equal(r.code, 0)
    })

    test('refuses a threshold outside 0-100', () => {
      const r = run('score.mjs', ['--statuses', '{}', '--fail-under', '150'])
      assert.equal(r.code, 2)
      assert.match(r.stderr, /between 0 and 100/)
    })
  })

  describe('state files', () => {
    let dir
    const stateWith = (items, { bom = false } = {}) => {
      dir ??= mkdtempSync(join(tmpdir(), 'seo-butler-score-'))
      const path = join(dir, 'state.json')
      writeFileSync(path, (bom ? '﻿' : '') + JSON.stringify({ version: 1, items }), 'utf8')
      return path
    }

    test('reads item statuses out of state.json', () => {
      const path = stateWith({ robots_txt: { status: 'done' }, sitemap_xml: { status: 'partial' } })
      const r = runJson('score.mjs', ['--state', path])
      assert.equal(r.code, 0)
      assert.equal(r.json.earnedWeight, FLAT.robots_txt + FLAT.sitemap_xml / 2)
    })

    test('a UTF-8 BOM does not break it', () => {
      // PowerShell's Set-Content -Encoding utf8 writes a BOM by default, so a state.json touched on
      // Windows can arrive with one through no fault of the user.
      const path = stateWith({ robots_txt: { status: 'done' } }, { bom: true })
      const r = runJson('score.mjs', ['--state', path])
      assert.equal(r.code, 0, r.stderr)
      assert.equal(r.json.earnedWeight, FLAT.robots_txt)
    })

    test('a missing state file explains itself instead of scoring 0', () => {
      const r = run('score.mjs', ['--state', join(tmpdir(), 'definitely-not-here-9f3a.json')])
      assert.equal(r.code, 2)
      assert.match(r.stderr, /No state file/)
    })

    test.after(() => { if (dir) rmSync(dir, { recursive: true, force: true }) })
  })

  test('two runs on the same input are byte-identical', () => {
    const statuses = JSON.stringify({ ...allOf('done'), hreflang: 'n/a', structured_data: 'partial' })
    const a = run('score.mjs', ['--statuses', statuses, '--json'])
    const b = run('score.mjs', ['--statuses', statuses, '--json'])
    assert.equal(a.stdout, b.stdout)

    const c = run('score.mjs', ['--statuses', statuses])
    const d = run('score.mjs', ['--statuses', statuses])
    assert.equal(c.stdout, d.stdout, 'the human-readable render must be stable too')
  })
})
