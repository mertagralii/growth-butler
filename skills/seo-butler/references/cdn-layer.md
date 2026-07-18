# CDN / Edge Layer — what the code says is not what the internet gets

## The golden rule
**Never trust the repo about robots.txt, headers, or bot access. Fetch the live URL.**
A CDN or WAF sitting in front of the origin can generate, replace, or block things the application never
knows about. In the first real-world run this was the **highest-impact lever of the entire session**, and
none of it was visible in the codebase.

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
