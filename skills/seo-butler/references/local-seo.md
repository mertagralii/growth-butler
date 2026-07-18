# Local SEO — the opt-in module for physical/local businesses

Most sites aren't local, so this is **not part of the fixed 35-item checklist**. It's an **opt-in
module** (like the strategy phase): offer it only when the site clearly belongs to a business with a
**physical location or service area** — a detected address/phone, a "Contact/Visit us" page with a map,
opening hours, or the user asking for it. If none of that is present, don't offer it.

Owner: `seo-technical` (schema) + `seo-geo-content` (content/NAP consistency). Keyless — no data
provider needed. Everything is fact-based: mark up and align what's real; never invent a location,
phone, or hours.

## What it does

### 1. LocalBusiness schema (depth beyond the base Organization)
When there's a real address, upgrade `Organization` to the most specific `LocalBusiness` subtype that
fits (e.g. `Restaurant`, `Store`, `ProfessionalService`) and populate the fields that actually exist:
- `name`, `address` (`PostalAddress`: street, locality, region, postalCode, country)
- `telephone`, `email`, `url`
- `geo` (`GeoCoordinates` lat/lng) if known
- `openingHoursSpecification` from the real, stated hours
- `areaServed` for service-area businesses; `priceRange` if genuinely shown
- `sameAs` (social/profile URLs) and the Google Business Profile URL if known
Only assert fields the page actually backs. Missing hours/geo → omit, don't guess.

### 2. NAP consistency (Name / Address / Phone)
The single biggest local-SEO hygiene issue: the **same** business name, address, and phone must appear
**identically** everywhere on the site (footer, contact page, schema). Inconsistent NAP confuses both
Google and users and weakens local ranking.
- Extract every occurrence of name/address/phone across the site.
- Flag mismatches (abbreviations, old address, different phone formats) and normalize to one canonical
  form — surface the change in the plan (it can touch visible content, so it goes through approval).
- Ensure the canonical NAP matches the `LocalBusiness` schema exactly.

### 3. Google Business Profile (dashboard-side, honest)
A Google Business Profile (GBP) is where most local visibility actually happens — but it's an external
account, not code. So:
- **Prepare the code side:** LocalBusiness schema + consistent NAP + a map/hours section if missing.
- **Guide the dashboard side honestly:** tell the user a GBP is the highest-impact local step and how
  to claim/verify it (verification is a postcard/phone step only they can complete). Never claim GBP is
  "done" from code — it needs the user. This mirrors the Search Console honesty rule.

## Where it plugs in
- Offered in the plan's **Optional** section (`plan.md`) — never selected by default.
- Findings that touch visible content (NAP normalization) follow the **body-copy approval boundary**
  (`safety.md`).
- Record a compact summary in `state.json` (a `localSeo` sibling block: schema type applied, NAP
  status, GBP status) so a re-run refreshes rather than redoes.

## Honesty rules
- **Never invent** an address, phone, hours, geo, or price. If the business facts aren't in the site or
  the shared profile, ask for the one missing fact — don't fabricate it.
- **Don't add `LocalBusiness` at all** if the site isn't actually a local/physical business — a fake
  local entity is worse than none (and can trigger Google trust issues).
- GBP and reviews are the user's to own; the butler prepares and guides, it doesn't impersonate.
