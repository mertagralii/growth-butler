/**
 * triage-external.mjs - adjudicating what outside auditors report.
 *
 * Two opposite failures are both real and both damaging. Obeying a false positive edits a site that
 * was already correct; dropping a finding because it did not match a known pattern loses a genuine
 * defect silently. The script sits between those, so these tests push on both sides: the measured
 * false positives must be suppressed *with their reason*, and anything unrecognised must survive to
 * the output labelled rather than vanish.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { run, runJson, fixture } from './helpers/run.mjs'

const OPENSEO = fixture('external', 'openseo-issues.json')
const GEODADDY = fixture('external', 'geodaddy-report.json')
const LIGHTHOUSE = fixture('external', 'lighthouse-lhr.json')
const CLEAN = fixture('external', 'openseo-clean.json')

const ALL = ['--openseo', OPENSEO, '--geodaddy', GEODADDY, '--lighthouse', LIGHTHOUSE]

function triage (args) {
  const r = runJson('triage-external.mjs', args)
  assert.ok(r.json, `stdout was not JSON:\n${r.stdout}\n${r.stderr}`)
  return r.json
}

const bySubject = (result, subject) => result.groups.find(g => g.subject === subject)
const byItem = (result, item, verdict) =>
  result.groups.find(g => g.item === item && (!verdict || g.verdict === verdict))
const reasonText = group => group.reasons.join(' ')

describe('triage-external.mjs', () => {
  test('collapses one dead URL reported many ways into one job', () => {
    // The fixture reports /Home/Index five times: four "a link here is broken" findings from four
    // different pages, plus one "this page is 404" finding about the URL itself. That is one fix.
    const result = triage(['--openseo', OPENSEO])
    const dead = bySubject(result, '/Home/Index')

    assert.ok(dead, 'the dead URL should be its own subject')
    assert.equal(dead.verdict, 'act')
    assert.equal(dead.item, 13)
    assert.deepEqual(dead.codes, ['broken-internal-link', 'broken-page'])
    assert.deepEqual(dead.affectedUrls, ['/', '/about', '/pricing'],
      'the linking pages are listed once each; the dead URL itself is not double-counted')
    assert.ok(result.rawFindings > result.groups.length, 'raw findings must outnumber the jobs')
  })

  test('flags what two independent sources agree on', () => {
    // OpenSEO and geodaddy found the skipped heading level separately. Neither is hallucinating.
    const result = triage(ALL)
    const headings = byItem(result, 19, 'act')

    assert.ok(headings, 'the heading-order finding should survive as act')
    assert.equal(headings.corroborated, true)
    assert.deepEqual(headings.sources, ['geodaddy', 'openseo'])
  })

  test('a single source is not marked as corroborated', () => {
    const result = triage(['--openseo', OPENSEO])
    assert.ok(result.groups.every(g => g.corroborated === false))
  })

  describe('measured false positives are suppressed, with the reason attached', () => {
    test('OpenSEO: missing meta description on a page it called noindex', () => {
      const result = triage(['--openseo', OPENSEO])
      const desc = byItem(result, 4)

      assert.equal(desc.verdict, 'informational', 'not work - a noindex page never shows a description')
      assert.match(reasonText(desc), /Suppressed/)
      assert.match(reasonText(desc), /noindex/)
    })

    test('geodaddy: "@type missing" on canonical @graph JSON-LD', () => {
      const result = triage(['--geodaddy', GEODADDY])
      const jsonld = byItem(result, 9)

      assert.equal(jsonld.verdict, 'verify', 'never auto-acted on')
      assert.match(reasonText(jsonld), /KNOWN FALSE POSITIVE/)
      assert.match(reasonText(jsonld), /@graph/)
    })

    test('geodaddy: "no listicle structure" on ordinary prose', () => {
      const result = triage(['--geodaddy', GEODADDY])
      const listicle = byItem(result, 18)

      assert.equal(listicle.verdict, 'verify')
      assert.match(reasonText(listicle), /KNOWN FALSE POSITIVE/)
    })

    test('geodaddy: "requires site-wide crawl mode" is a coverage note, not a defect', () => {
      const result = triage(['--geodaddy', GEODADDY])
      const links = byItem(result, 13, 'informational')

      assert.ok(links, 'must not be filed as a broken-link defect')
      assert.match(reasonText(links), /KNOWN FALSE POSITIVE/)
    })

    test('Lighthouse: is-crawlable failing on a deliberately noindex auth page', () => {
      // Only suppressed because OpenSEO's own output says that URL is noindex. Lighthouse alone
      // cannot know intent, so on its own the finding stays open for a human.
      const withContext = triage(ALL)
      assert.equal(byItem(withContext, 11).verdict, 'informational')

      const alone = triage(['--lighthouse', LIGHTHOUSE])
      const crawlable = alone.groups.find(g => g.codes.includes('is-crawlable'))
      assert.equal(crawlable.verdict, 'verify', 'without the noindex context it must not be dismissed')
      assert.match(reasonText(crawlable), /KNOWN FALSE POSITIVE/)
    })
  })

  test('an unrecognised issue type is kept and labelled, never dropped', () => {
    // Silently discarding an unknown finding is the most dangerous failure available here: it looks
    // exactly like a clean report.
    const result = triage(['--openseo', OPENSEO])
    const unknown = bySubject(result, 'quantum-entanglement-score')

    assert.ok(unknown, 'the finding must survive triage')
    assert.equal(unknown.verdict, 'verify')
    assert.equal(unknown.item, null)
    assert.match(reasonText(unknown), /No mapping/)
    assert.match(reasonText(unknown), /judge it manually/)
  })

  test('an edge-injected URL is routed to the dashboard, not to the repo', () => {
    const result = triage(['--openseo', OPENSEO])
    const cdn = bySubject(result, '/cdn-cgi/l/email-protection')

    assert.equal(cdn.verdict, 'edge')
    assert.equal(cdn.item, 14, 'item 14 is the edge/CDN override check, not item 13')
    assert.match(reasonText(cdn), /Cloudflare/)
  })

  describe('Lighthouse normalisation', () => {
    test('unscored and passing audits do not become work', () => {
      const result = triage(['--lighthouse', LIGHTHOUSE])
      const codes = result.groups.flatMap(g => g.codes)

      assert.ok(!codes.includes('document-title'), 'a passing audit is not a finding')
      assert.ok(!codes.includes('structured-data'), 'a manual audit was never judged')
      assert.ok(!codes.includes('canonical'), 'a notApplicable audit was never judged')
      assert.ok(codes.includes('image-alt'), 'a genuinely failing audit is kept')
    })

    test('a partial score is a warning, a zero is critical', () => {
      const result = triage(['--lighthouse', LIGHTHOUSE])
      assert.equal(result.groups.find(g => g.codes.includes('image-alt')).severity, 'critical')
      assert.equal(result.groups.find(g => g.codes.includes('unsized-images')).severity, 'warning')
    })
  })

  describe('--fail-on-act (the convergence loop stopping rule)', () => {
    test('exits 1 while anything remains to fix', () => {
      const r = run('triage-external.mjs', ['--openseo', OPENSEO, '--fail-on-act', '--json'])
      assert.equal(r.code, 1)
      assert.ok(JSON.parse(r.stdout).summary.act > 0)
    })

    test('exits 0 when only suppressed and informational findings are left', () => {
      const r = run('triage-external.mjs', ['--openseo', CLEAN, '--fail-on-act', '--json'])
      assert.equal(r.code, 0)
      assert.equal(JSON.parse(r.stdout).summary.act, 0)
    })

    test('a clean round says the sources are clean, not that the site is perfect', () => {
      const r = run('triage-external.mjs', ['--openseo', CLEAN])
      assert.match(r.stdout, /not that the site is perfect/)
    })
  })

  describe('input handling', () => {
    test('reads a report from stdin', () => {
      const r = run('triage-external.mjs', ['--openseo', '-', '--json'], {
        input: readFileSync(OPENSEO, 'utf8')
      })
      assert.equal(r.code, 0, r.stderr)
      assert.ok(JSON.parse(r.stdout).groups.length > 0)
    })

    test('accepts a bare issues array as well as the wrapped object', () => {
      const wrapped = JSON.parse(readFileSync(OPENSEO, 'utf8'))
      const r = run('triage-external.mjs', ['--openseo', '-', '--json'], {
        input: JSON.stringify(wrapped.issues)
      })
      assert.equal(r.code, 0, r.stderr)
      assert.equal(JSON.parse(r.stdout).rawFindings, wrapped.issues.length)
    })

    test('malformed JSON fails loudly', () => {
      const r = run('triage-external.mjs', ['--openseo', '-'], { input: '{not json' })
      assert.equal(r.code, 2)
      assert.match(r.stderr, /not valid JSON/)
    })

    test('no input at all prints usage and exits 2', () => {
      const r = run('triage-external.mjs', [])
      assert.equal(r.code, 2)
      assert.match(r.stdout, /At least one input is required/)
    })
  })

  test('two runs on the same input are byte-identical', () => {
    const a = run('triage-external.mjs', [...ALL, '--json'])
    const b = run('triage-external.mjs', [...ALL, '--json'])
    assert.equal(a.stdout, b.stdout)

    const c = run('triage-external.mjs', ALL)
    const d = run('triage-external.mjs', ALL)
    assert.equal(c.stdout, d.stdout)
  })
})
