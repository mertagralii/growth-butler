# CDN / Edge Layer — what the code says is not what the internet gets

## The golden rule
**Never trust the repo about robots.txt, headers, bot access, or the HTML body. Fetch the live URL.**
A CDN or WAF sitting in front of the origin can generate, replace, or block things the application never
knows about. In the first real-world run this was the **highest-impact lever of the entire session**, and
none of it was visible in the codebase.

The rule was originally written for robots.txt, and that scoping cost a real finding: a site whose repo
contained a perfectly ordinary `mailto:` shipped a **404-ing contact link on five pages**, because the
edge had rewritten it. Nothing in the codebase was wrong, so no amount of source reading could have
found it. **Anything the edge can touch has to be checked live — markup included.**

Check it whenever the site is already live — during a normal run (checklist item 14) and always during
`/seo-live` (see `live-verification.md`).

## How to detect an override
1. Fetch `https://<site>/robots.txt` and compare it to what the application serves (the file in the
   public directory, or the controller/route that generates it).
2. Any difference — extra directives, `Content-Signal` lines, different `Disallow` sets, a different
   `Sitemap:` URL — means **something at the edge is rewriting it**.
3. Do the same spot-check for security headers and for AI-bot user agents if you suspect blocking.

## Cloudflare map (the case we hit — and its traps)
Cloudflare exposes AI/bot control in **more than one place, and they are not independent**:

- **`AI Crawl Control → Signals → Managed robots.txt`** — when ON, Cloudflare *generates* robots.txt and
  shadows the origin's. The live file will contain `Content-Signal` directives and `Disallow: /` blocks
  the app never wrote.
- **`AI Crawl Control → Security`** — per-bot allow/block toggles.
- **`Security → Settings → Block AI bots`** — **the master switch.** When its scope is "Block on all
  pages", it *locks* the per-bot toggles above.
- **`Security → Settings → Bot fight mode`** — can also challenge/block legitimate crawlers.

**The trap that costs the most time:** while the master switch is on, clicking an individual bot toggle
**silently does nothing** — no error, no feedback. The only clue is the tooltip:
> *"This crawler is being blocked by the Block AI Bots security setting. Disable it to control it in AI Crawl Control."*

So: **fix the master switch first**, then the per-bot toggles become effective.

### Scrape Shield — the edge rewriting the HTML body
Separate from bot control, and easy to miss because it breaks *content* rather than access:

- **`Scrape Shield → Email Address Obfuscation`** — replaces every `mailto:` href with
  `/cdn-cgi/l/email-protection#<hex>` plus a `data-cfemail` attribute, and restores the address with
  JavaScript. **That path returns 404 to anything that doesn't run JS.** The visible symptom is a pile of
  "broken internal link" findings pointing at one `/cdn-cgi/` URL from every page that shows an email —
  and the real cost is that your contact address is invisible to search and AI crawlers (checklist item 35,
  and a GEO Tier 1 gap per `geo.md`). Detect it by the `data-cfemail` attribute in the live HTML.
  **The repo is not at fault; never "fix" the `mailto:`.** The trade is obfuscation against scrapers vs.
  a reachable contact address — tell the user both sides and let them choose. Turning it off is one toggle.
- **`Speed → Optimization → Rocket Loader`** — defers/rewrites scripts; can delay or break JSON-LD
  injected by JS, and changes what a non-JS crawler sees.
- **Auto Minify / HTML post-processing** — edits markup after the origin emits it.

**How to check all three at once:** fetch the live page and diff its `<head>` and link hrefs against
what the application renders locally. `validate-artifacts.mjs --url` flags the `/cdn-cgi/` case by name.

**Scheduled change to look for:** Cloudflare has surfaced a dated setting where *mixed-purpose* crawlers
(bots that both index for search **and** train models) get folded into the AI-training block. Mixed-purpose
includes **Googlebot** — so leaving the default can quietly damage ordinary search visibility on that date.
Check the preference and flag it to the user.

## Other providers
The same class of problem exists elsewhere — check before assuming the origin wins:
- **Vercel / Netlify** — edge config, redirects/headers files, and generated robots for preview domains.
- **Fastly / Akamai / AWS CloudFront** — edge logic and WAF rules can rewrite or block.
- Any WAF/bot-management product may 403 AI or search crawler user agents.

## What the butler does about it
- **Report the mismatch loudly** — with both versions side by side (origin vs live). This is a finding the
  user almost certainly doesn't know about.
- **These are not code fixes.** Don't try to "fix" them in the repo; the repo is already right. Guide the
  user through their provider's dashboard in their own logged-in browser (never handle credentials), the
  same way the dashboard steps work in `checklist.md` items 32–33.
- After the user changes a setting, **re-fetch the live URL to confirm** it actually took effect — these
  panels are exactly where silent failures happen.

## Honesty
- Don't claim a CDN setting is fixed until the live fetch proves it.
- If the site isn't reachable or you can't determine the edge behavior, say so rather than guessing.
