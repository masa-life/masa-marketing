# masa.life — the company landing page

Single static page on the `masa.life` apex: the brand surface. `app.masa.life`
is the product and `masa.tools` the team workspace; neither is served from this
repo.

This page began life on the `.co` apex as a temporary holding page for Apple
Developer Program enrollment. The `masa.life` cutover in ADR-0184 has since
happened, so **`masa.life` is the live domain and the canonical host**.
`masalife.co` and `masalife.app` are legacy defensive holds and should redirect
here, not serve a copy of this page — two hosts serving the same HTML is how a
site competes with itself for its own name. `docs/reference/environments-and-domains.md`
in masa-app is the current answer on the domain topology; the ADRs are history.

Every absolute URL on the page — canonical, `og:url`, `og:image`, the JSON-LD
`@id`s, `sitemap.xml`, `robots.txt` — points at `https://masa.life`. If that
ever changes, they all change together.

## Files

- `index.html` — company landing page (inline CSS, small vanilla-JS nav highlighter and waitlist form).
- `assets/` — logo icon, app screenshot, and the Open Graph share card referenced by `index.html`.
- `scripts/make-og-image.py` — regenerates `assets/og-image.png`. Run it when the hero copy changes.
- `robots.txt` — crawl policy; points at the sitemap.
- `sitemap.xml` — the one page, with a hand-set `lastmod`.
- `llms.txt` — what Masa is, for the models that now answer questions about it.
- `_headers` — Cloudflare Pages security headers.

## What's on the page

- Company name: **Masa Life, Inc.**
- Nav, hero, about, offerings, Charter waitlist, founder's story, and contact sections.
- Charter waitlist form: posts to `https://masa.tools/api/waitlist`. Open-phase
  fields are email (required), country, first name, journey stage, and how they
  heard about Masa. The last two are validated against a fixed vocabulary in
  masa-tools' `worker.js` (`JOURNEY_STAGES`, `HOW_HEARD_OPTIONS`) and anything
  it does not recognise is dropped to empty without an error, so the `value`
  attributes here and those two sets have to be changed together.
- Launch copy is hand-written, not derived from a date. The page does not know
  what phase it is in: masa-app (`src/lib/charter.dates.ts`, which owns the
  calendar per ADR-0357) and masa-tools (`WAITLIST_PHASES`) both switch
  themselves at midnight Pacific, and this page has to be edited to match.
- Contact email: `hello@masa.life`.
- Footer links: Privacy Policy, Terms of Service, Contact.
- No analytics. Nothing here measures whether any of the search work below
  lands; Search Console is the only feedback loop the page currently has.
- `index`able (the previous `noindex` has been removed so Apple can verify the site).

## Search and sharing

- **Share card.** `assets/og-image.png`, 1200×630, built by
  `scripts/make-og-image.py` from the page's own tokens and self-hosted faces.
  It is generated ahead of time, so **changing the hero copy means re-running
  the script** — otherwise the preview quotes a line the page no longer has.
- **Structured data.** A single JSON-LD `@graph` in the head: `Organization`,
  `WebSite`, `WebPage`. Deliberately no `Event` or `Offer` for the Charter
  waitlist — the launch copy is already hand-synced across three repos, and a
  stale date in structured data is the version Google quotes.
- **`sitemap.xml`.** `lastmod` is hand-set. Move it when the copy changes, not
  on every deploy; a `lastmod` that always says "today" is one Google stops
  reading.
- **Images** are palette-quantised PNGs, not truecolour. The page is flat brand
  colour and two faces, so a 192–256 entry palette is visually identical at
  roughly a quarter of the bytes. Re-exporting an asset from a design tool will
  undo that — quantise it again on the way in.

## Core Web Vitals

`node scripts/measure-vitals.js` re-measures the page: it serves the repo over
loopback with the HTML brotli'd the way Cloudflare serves it, loads it in
Chromium under Slow 4G with a 4x CPU throttle, and prints the median of seven
runs at phone and desktop widths. Needs `npm install playwright`.

As measured, both viewports pass with a lot of room:

| | LCP | CLS |
|---|---|---|
| phone, 390×844 | 300ms | 0.0098 |
| desktop, 1280×800 | 380ms | 0.0008 |
| Google's "good" | under 2500ms | under 0.1 |

Three things worth not re-deriving:

- **The LCP element is the `h1`, not the screenshot beside it.** The screenshot
  looks bigger but is not; on a phone the h1 is a 326×205 block and the image
  renders 326×169, and on desktop the h1 wins too. Optimising for the image is
  optimising the wrong element.
- **Adding `<link rel="preload">` for the fonts makes things worse.** Tried,
  measured over seven runs a side: it cost roughly 80ms of LCP on both
  viewports and moved CLS by 0.0002. `font-display: swap` already paints the h1
  in the fallback serif immediately, so there is no paint waiting on the font,
  and the preload just competes with the document for the same bandwidth. This
  is the obvious-looking change that is wrong; don't re-add it without re-running
  the script.
- **The remaining phone CLS is the font swap**, at about 1.7s: the h1 reflows
  when Cormorant replaces the fallback serif and pushes the CTA row and the
  waitlist note down. Removing it properly means metric-matched fallbacks
  (`size-adjust`, `ascent-override`) tuned per platform, since the fallback
  serif differs on Windows, macOS and Android. At 0.0098 against a 0.1 budget
  that is not worth the fragility on a page synced by hand from a design canvas.

INP needs nothing: the only script is an `IntersectionObserver` and a submit
handler, with no scroll listeners, and it runs at the end of the body.

## Syncing from Claude Design

This page is synced by hand from a Claude Design canvas (`masa-life/masa-marketing`,
branch `master`, file `index.html`). Claude Design has read-only access to this repo —
it can browse the code but cannot push — so after editing the canvas, its `Masa
Landing.dc.html` export needs to be translated into `index.html` and committed here
manually (the `.dc.html` format and its `support.js`/`image-slot.js` runtime are
editor-only and are not shipped to production).

## Deploy

1. Create a Cloudflare Pages project connected to a repo containing these files.
2. Set build command to empty and output directory to `/`.
3. Attach `masa.life` and `www.masa.life` as custom domains.
4. Point `masalife.co` and `masalife.app` at a 301 → `https://masa.life/$1`.
   They are defensive holds; they should never serve this page themselves.
5. Verify `https://masa.life` loads and WHOIS shows **Masa Life, Inc.** as the registrant.

The Cloudflare project is still named `masalife-holding` in `wrangler.jsonc`,
from when the page lived on the `.co`. The name is cosmetic and renaming it
means recreating the project and re-attaching the domains, so it is left alone
deliberately — it is not evidence of which domain is live.

## Brand tokens

- `#4A4E5A` Slate Warm — wordmark, links
- `#F3EFEA` Warm Mist — background
- `#8FA3BE` / `#B6CAE0` — logo embrace halves
- Cormorant Garamond 500 — wordmark
- Inter 400/500 — body
