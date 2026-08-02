/**
 * validate-artifacts.mjs --root - checking the artifacts as they exist in the repo.
 *
 * The headline case here is the one that must never come back: reporting robots.txt and sitemap.xml
 * as MISSING on stacks that serve them from a route. ASP.NET Core, Django, Rails, Laravel and Spring
 * all do, and calling that a failure told a developer their correct site was broken. Absence in the
 * public dir is uncertainty, not a defect, and only a live response can settle it.
 */

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { run, runJson, check, fixture } from './helpers/run.mjs'
import { sitemap, robotsTxt } from './helpers/fixture-server.mjs'

const STATIC = fixture('repo-static')
const DYNAMIC = fixture('repo-dynamic')

function audit (args) {
  const r = runJson('validate-artifacts.mjs', args)
  assert.ok(r.json, `stdout was not JSON:\n${r.stdout}\n${r.stderr}`)
  return r.json
}

/**
 * Repos that need bytes we would rather not commit are built at run time.
 *
 * The BOM one especially: a committed file whose only distinguishing feature is three invisible
 * leading bytes is one editor save or one git filter away from silently losing them, and the test
 * would keep passing while checking nothing.
 */
let tmp
const repos = {}

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'seo-butler-root-'))

  const make = (name, files) => {
    const dir = join(tmp, name, 'public')
    mkdirSync(dir, { recursive: true })
    for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content)
    repos[name] = join(tmp, name)
  }

  make('bom', {
    'robots.txt': robotsTxt(),
    'sitemap.xml': sitemap(['/'], { bom: true })
  })
  make('blocked', {
    'robots.txt': robotsTxt({ disallowAll: true }),
    'sitemap.xml': sitemap(['/'])
  })
  make('relative-sitemap', {
    'robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml\n',
    'sitemap.xml': sitemap(['/'])
  })
  make('broken-xml', {
    'robots.txt': robotsTxt(),
    'sitemap.xml': '<?xml version="1.0"?>\n<urlset><url><loc>https://example.com/</loc></url>\n'
  })
})

after(() => { if (tmp) rmSync(tmp, { recursive: true, force: true }) })

describe('validate-artifacts.mjs --root', () => {
  test('a repo with correct static artifacts passes cleanly', () => {
    const result = audit(['--root', STATIC])
    assert.equal(result.summary.fail, 0)
    assert.equal(result.summary.warn, 0)
    assert.equal(check(result, 'robots.repo.present').status, 'pass')
    assert.equal(check(result, 'sitemap.repo.present').status, 'pass')
    assert.equal(check(result, 'sitemap.repo.bom').status, 'pass')
    assert.equal(check(result, 'llms.repo').status, 'pass')
  })

  describe('artifacts served from a route (the P0-B regression guard)', () => {
    test('absence in the public dir is skip, never fail', () => {
      const result = audit(['--root', DYNAMIC])

      for (const id of ['robots.repo.present', 'sitemap.repo.present']) {
        const c = check(result, id)
        assert.equal(c.status, 'skip', `${id} must not accuse a correct server-rendered site`)
        assert.match(c.detail, /generate it from a route/)
        assert.match(c.detail, /--url/, 'it must say how to settle the question')
      }
      assert.equal(result.summary.fail, 0)
    })

    test('and --strict does not fail the run over it', () => {
      const r = run('validate-artifacts.mjs', ['--root', DYNAMIC, '--strict'])
      assert.equal(r.code, 0, 'uncertainty is not a failing check')
    })
  })

  test('a UTF-8 BOM on sitemap.xml fails - it is checked on the bytes', () => {
    // Invisible in an editor and in `cat`; strict XML parsers reject the whole document. Field bug.
    const result = audit(['--root', repos.bom])
    const bom = check(result, 'sitemap.repo.bom')

    assert.equal(bom.status, 'fail')
    assert.match(bom.detail, /EF BB BF/)

    const r = run('validate-artifacts.mjs', ['--root', repos.bom, '--strict'])
    assert.equal(r.code, 1)
  })

  test('a site-wide Disallow is reported as the site vanishing, and as blocking AI bots', () => {
    const result = audit(['--root', repos.blocked])

    const blanket = check(result, 'robots.repo.blanket-disallow')
    assert.equal(blanket.status, 'fail')
    assert.match(blanket.detail, /most common cause of a site vanishing/)

    const bots = check(result, 'robots.repo.ai-bots')
    assert.equal(bots.status, 'fail', 'a catch-all block sweeps up the citation crawlers too')
    assert.equal(bots.checklist, 17)
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'GoogleOther', 'CCBot', 'Bytespider']) {
      assert.match(bots.detail, new RegExp(bot))
    }
  })

  test('a relative Sitemap: directive warns - the spec wants an absolute URL', () => {
    const result = audit(['--root', repos['relative-sitemap']])
    const directive = check(result, 'robots.repo.sitemap-directive')
    assert.equal(directive.status, 'warn')
    assert.match(directive.detail, /absolute URL/)
  })

  test('an unbalanced sitemap is reported as malformed', () => {
    const result = audit(['--root', repos['broken-xml']])
    const structure = check(result, 'sitemap.repo.structure')
    assert.equal(structure.status, 'fail')
    assert.match(structure.detail, /unclosed tag/)
  })

  test('a missing llms.txt warns rather than fails - it is a Tier 6 nice-to-have', () => {
    const result = audit(['--root', DYNAMIC])
    const llms = check(result, 'llms.repo')
    assert.equal(llms.status, 'warn')
    assert.match(llms.detail, /genuinely minor/)
  })

  test('every check carries the checklist item it belongs to', () => {
    // The score card and the triage step both key off these, so a check with no item silently stops
    // counting towards anything.
    const result = audit(['--root', STATIC])
    for (const c of result.checks) {
      if (c.status === 'info') continue
      assert.ok(c.item, `check ${c.id} has no state.json item key`)
      assert.ok(Number.isInteger(c.checklist), `check ${c.id} has no checklist number`)
    }
  })

  describe('argument handling', () => {
    test('needs at least one of --url or --root', () => {
      const r = run('validate-artifacts.mjs', [])
      assert.equal(r.code, 2)
      assert.match(r.stderr, /at least one of --url or --root/i)
    })

    test('rejects an unknown flag instead of ignoring it', () => {
      const r = run('validate-artifacts.mjs', ['--root', STATIC, '--turbo'])
      assert.equal(r.code, 2)
      assert.match(r.stderr, /Unknown argument: --turbo/)
    })

    test('rejects a nonsense --max-links', () => {
      const r = run('validate-artifacts.mjs', ['--root', STATIC, '--max-links', '0'])
      assert.equal(r.code, 2)
      assert.match(r.stderr, /--max-links must be a positive number/)
    })
  })

  test('two runs on the same repo are byte-identical', () => {
    const a = run('validate-artifacts.mjs', ['--root', STATIC, '--json'])
    const b = run('validate-artifacts.mjs', ['--root', STATIC, '--json'])
    assert.equal(a.stdout, b.stdout)
  })
})
