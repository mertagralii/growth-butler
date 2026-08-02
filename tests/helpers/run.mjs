/**
 * Black-box runner for the plugin's scripts.
 *
 * The scripts export nothing and call main() at module scope, so importing them would run main()
 * and hit process.exit. That is deliberate - they are CLIs, invoked exactly this way from
 * commands/*.md and agents/*.md. So the tests drive them as CLIs too: same argv, same stdout, same
 * exit code. Nothing in scripts/ has to change to be testable, and the thing under test is the
 * contract the plugin actually depends on, including the exit codes the convergence loop reads.
 */

import { spawnSync, execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))

export const REPO = join(HERE, '..', '..')
export const SCRIPTS = join(REPO, 'scripts')
export const FIXTURES = join(HERE, '..', 'fixtures')

/** Run a script in scripts/ and capture stdout, stderr and the exit code. */
export function run (script, args = [], opts = {}) {
  const res = spawnSync(process.execPath, [join(SCRIPTS, script), ...args], {
    encoding: 'utf8',
    input: opts.input,
    cwd: opts.cwd ?? REPO,
    timeout: opts.timeout ?? 60_000
  })
  if (res.error) throw res.error
  return { code: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' }
}

/** Same, with --json appended and the payload parsed. `json` is null when stdout was not JSON. */
export function runJson (script, args = [], opts = {}) {
  const r = run(script, [...args, '--json'], opts)
  try {
    r.json = JSON.parse(r.stdout)
  } catch {
    r.json = null
  }
  return r
}

/**
 * Async variant — REQUIRED whenever the script under test has to talk to a server living in this
 * process. spawnSync blocks the whole event loop, so the fixture server could never answer and the
 * run would deadlock rather than fail.
 */
export function runAsync (script, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [join(SCRIPTS, script), ...args],
      { encoding: 'utf8', cwd: opts.cwd ?? REPO, timeout: opts.timeout ?? 60_000, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && typeof err.code !== 'number') return reject(err)
        resolve({ code: err ? err.code : 0, stdout: stdout ?? '', stderr: stderr ?? '' })
      }
    )
  })
}

/** Async runAsync + --json, with the payload parsed. */
export async function runJsonAsync (script, args = [], opts = {}) {
  const r = await runAsync(script, [...args, '--json'], opts)
  try {
    r.json = JSON.parse(r.stdout)
  } catch {
    r.json = null
  }
  return r
}

/** Look up a single check by id from a validate-artifacts.mjs --json result. */
export function check (result, id) {
  return result.checks.find(c => c.id === id) ?? null
}

/** Every check whose id starts with `prefix`. */
export function checksLike (result, prefix) {
  return result.checks.filter(c => c.id.startsWith(prefix))
}

export function fixture (...parts) {
  return join(FIXTURES, ...parts)
}
