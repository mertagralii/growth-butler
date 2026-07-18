# Safety & Verification — never break a site

The rule: **applying SEO must never make the site worse.** A plugin that breaks a site once gets
uninstalled forever. When torn between a risky improvement and safety, choose safety and *report* the
recommendation instead of forcing it.

## Before applying — git-aware backup (smart git check)
Run this check after the plan is approved, before touching any file:

1. **Is it a git repo?** (`git rev-parse --is-inside-work-tree`)
2. **If git repo:**
   - **Clean tree** → proceed. Changes will land in the working tree; the user reviews them with
     `git diff` and can undo with `git checkout` / `git restore`. Tell them this.
   - **Dirty tree (uncommitted changes)** → warn: "You have uncommitted changes — I recommend
     committing or stashing them first so my edits are easy to separate and revert." Proceed only on
     the user's OK. **Never auto-commit or stash the user's unrelated work.**
   - Do **not** create commits on the user's behalf. Plan approval authorizes *edits*, not commits.
3. **If NOT a git repo:** recommend `git init` (so changes are trackable/revertable), or, if the user
   declines, make a lightweight backup of the files about to change into
   `.seo-butler/backup/<runId>/` before editing. Inform the user either way, then proceed.

## Idempotency — safe re-runs
- Read `state.json` first; skip items already `done` and still valid.
- Before adding any tag/file, check whether it already exists — **update in place, never duplicate**:
  no two `<title>`, no double canonical, no repeated JSON-LD block, no duplicated robots rules.
- Regenerate whole-file artifacts (robots.txt, sitemap.xml, llms.txt) deterministically — don't append.

## Preserve the user's work
- Never overwrite existing meaningful metadata/content without surfacing it in the plan. **Complete
  and repair; don't replace.**
- **Body-copy edit boundary:** metadata fields (title, meta, headings, alt) may be edited directly.
  Edits to the user's **substantive body copy** (keyword/readability/internal-link edits) are only ever
  applied **after the user approves them in the plan** — never silently. Never fabricate facts/stats/
  reviews, and never write new articles/content from scratch.
- Match the project's conventions: indentation, quote style, framework idioms.

## Who verifies (centralize it)
**Apply specialists never run builds, tests, or the app.** Parallel agents building at the same time fight
over file locks, and a running app locks its own binaries. Verification is the **orchestrator's** job and
happens **once, after every apply agent has finished**. Say this explicitly in each apply brief.

## After applying — verify, then roll back if broken
Detect the project's own checks (from `package.json` scripts / config) and run what's available:
- **Build / typecheck:** e.g. `npm run build`, `tsc --noEmit`, the framework build. If it now fails
  due to our change, fix it or revert that change.
- **Lint / format:** run if present; apply safe auto-fixes.
- **Validate generated artifacts:**
  - robots.txt parses and contains an absolute `Sitemap:` line.
  - sitemap.xml is well-formed XML, URLs absolute, within size/count limits.
  - Each JSON-LD block is valid JSON and satisfies its schema.org required fields (no fabricated values).
  - Head edits don't duplicate: exactly one `<title>`, one canonical, one `<h1>` per page.
- **On regression from our change:** revert that specific change (`git checkout -- <file>` in a repo;
  restore from `.seo-butler/backup/` otherwise), mark the item `partial`/`todo` in state with the
  reason, and report it honestly. **Never leave the project in a broken state.**

### Runtime verification — required whenever the project renders server-side
A build plus static file checks is **not enough**. In the first real-world run it caught only **1 of 4**
genuine defects: a template engine encoded `application/ld+json` into `application/ld&#x2B;json`, framework
link generation emitted a non-canonical URL site-wide, and `sitemap.xml` shipped with a BOM — all correct
in the files, all broken in the output. The lesson: **the file is not the output.**

So for any server-rendered or templated stack (and whenever a local run is possible):
1. Start the app on a local port.
2. Fetch every indexable route and every generated artifact over HTTP.
3. Verify against the **rendered response**, not the source:
   - canonical value, and whether duplicate routes really return **301** (not 200);
   - `<meta name="robots">` present/absent on the right pages;
   - JSON-LD: the literal string `application/ld+json` appears in the raw response — then **extract each
     block and parse it as JSON**; "the tag exists" is not verification;
   - rendered internal links point at the **canonical** variant;
   - sitemap: valid XML, no BOM (check the bytes);
   - analytics tag present only in the intended environment.
4. **If you can't run it, say so explicitly — never imply it was verified.**
5. *Optional while the local server is up:* run Lighthouse against it for early lab scores
   (`measurement.md`). Skip without ceremony if no browser is available — the real measurement happens
   against the deployed site in `/seo-live`, where CrUX field data is also available.

Local runtime verification proves it works on your machine. Proving it works *in production* is a separate
step the user triggers after deploying — see `live-verification.md` and the `/seo-live` command.

## Honesty
- If verification couldn't run (no build script, unknown stack, tool missing), say so — don't imply it passed.
- The score card / report states exactly what changed, what was verified, and what still needs the user.
