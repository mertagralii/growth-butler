/**
 * The plugin declares its version in three places. They drifted once already - the marketplace
 * listing sat at 2.1.0 while the plugin shipped 2.2.0, which is the version a user sees before
 * installing versus the one they actually get. Nothing was checking, so nothing noticed.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO } from './helpers/run.mjs'

const read = (...parts) => JSON.parse(readFileSync(join(REPO, ...parts), 'utf8'))

const plugin = read('.claude-plugin', 'plugin.json')
const marketplace = read('.claude-plugin', 'marketplace.json')
const pkg = read('package.json')

describe('plugin manifests', () => {
  test('the marketplace listing advertises the version that actually ships', () => {
    const listed = marketplace.plugins.find(p => p.name === plugin.name)
    assert.ok(listed, `marketplace.json does not list a plugin named "${plugin.name}"`)
    assert.equal(listed.version, plugin.version)
  })

  test('package.json agrees too', () => {
    // It exists only for the test harness, but a stale number here is the one a contributor reads
    // first.
    assert.equal(pkg.version, plugin.version)
  })

  test('the version is semver', () => {
    assert.match(plugin.version, /^\d+\.\d+\.\d+$/)
  })

  test('the marketplace source points at this repo', () => {
    const listed = marketplace.plugins.find(p => p.name === plugin.name)
    assert.equal(listed.source, './')
  })
})
