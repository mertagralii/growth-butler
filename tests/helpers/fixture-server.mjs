/**
 * A tiny canned-response HTTP server for the --url tests.
 *
 * validate-artifacts.mjs's most valuable checks only exist on the wire: an HTML-encoded JSON-LD
 * script type, a BOM in the sitemap bytes, a link that 404s, a redirect chain. None of them can be
 * reproduced by reading files, so the tests need something that actually answers HTTP.
 *
 * It binds to 127.0.0.1 on port 0 (the OS picks a free port), so the suite needs no network access
 * and cannot collide with anything the developer is running.
 */

import { createServer } from 'node:http'

/**
 * @param {Record<string, {status?: number, type?: string, headers?: object, body?: string|Buffer}>} routes
 *        keyed by pathname. Missing paths answer 404 with a minimal HTML body.
 */
export async function startServer (routes) {
  const hits = []

  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname
    hits.push({ method: req.method, path })

    const route = routes[path]
    if (!route) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
      res.end(req.method === 'HEAD' ? undefined : '<!doctype html><html><head><title>Not found</title></head><body>404</body></html>')
      return
    }

    res.writeHead(route.status ?? 200, {
      'content-type': route.type ?? 'text/html; charset=utf-8',
      ...(route.headers ?? {})
    })
    if (req.method === 'HEAD') return res.end()
    res.end(route.body ?? '')
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    hits,
    close: () => new Promise(resolve => server.close(resolve))
  }
}

// ---------------------------------------------------------------- page builders

/** A page with everything right, so a test only has to introduce the one defect it is about. */
export function goodPage ({
  title = 'A perfectly reasonable page title here',
  description = 'A meta description that sits comfortably inside the 50 to 160 character band the standards file asks for.',
  canonical = 'https://example.com/',
  headings = ['h1', 'h2'],
  jsonLdType = 'application/ld+json',
  jsonLd = null,
  links = [],
  extraHead = '',
  robotsMeta = null
} = {}) {
  const graph = jsonLd ?? JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Example Co', url: 'https://example.com/' },
      { '@type': 'WebSite', name: 'Example', url: 'https://example.com/' }
    ]
  })

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
${robotsMeta ? `<meta name="robots" content="${robotsMeta}">` : ''}
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="https://example.com/og.png">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
${extraHead}
<script type="${jsonLdType}">${graph}</script>
</head>
<body>
${headings.map((h, i) => `<${h}>Heading ${i + 1}</${h}>`).join('\n')}
${links.map(href => `<a href="${href}">go to ${href}</a>`).join('\n')}
</body>
</html>`
}

/**
 * `base` matters more than it looks: the link crawl seeds from --pages *and* the sitemap's <loc>
 * entries, and seeds are fetched without an origin check. A sitemap pointing at example.com would
 * send the test suite onto the real internet.
 */
export function sitemap (paths, { bom = false, lastmod = '2026-08-02', base = 'https://example.com' } = {}) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${base}${p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`
  return bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(xml, 'utf8')]) : xml
}

export function robotsTxt ({ sitemapUrl = 'https://example.com/sitemap.xml', disallowAll = false } = {}) {
  return `User-agent: *
${disallowAll ? 'Disallow: /' : 'Allow: /'}

Sitemap: ${sitemapUrl}
`
}
