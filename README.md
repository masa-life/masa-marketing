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
- Launch copy switches itself. See **Launch phases** below. It used to be
  hand-written and hand-edited, which meant that from the moment entries
  stopped the page kept saying "Waitlist open now" until somebody remembered.
- Contact email: `hello@masa.life`.
- Footer links: Privacy Policy, Terms of Service, Contact, Instagram.
- **Social profiles** are listed twice and both copies have to agree: as a
  footer link carrying `rel="me"`, and in `sameAs` on the Organization node in
  the JSON-LD. The footer link is for a visitor deciding whether this is a real
  company; `sameAs` is how a search engine ties the profiles to Masa Life, Inc.,
  which is what branded search leans on. Adding a platform means adding both.

  Only live profiles go in. A `sameAs` pointing at a 404, or a footer link to an
  empty profile, is worse than leaving the platform out — it is a broken link on
  the one page that has to look real. Instagram is `@app.masa.life`, because
  `masa.life` and `masalife` were both taken; TikTok, YouTube, Facebook and
  Pinterest are not listed because they were not confirmed live.
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

## Launch phases

The page dresses itself for one of four phases, the same four masa-app calls
`CharterWindow`:

| Phase | When | What the page shows |
|---|---|---|
| `before-waitlist` | before 17 Sep | waitlist opens soon, form collects an email |
| `waitlist-open` | 17 Sep – 3 Oct | the full waitlist form |
| `waitlist-closed` | 4 – 7 Oct | entries stopped, last batch going out, **no form** |
| `public-open` | 8 Oct onward | open to everyone, link to `app.masa.life` |

**How it works.** An inline script at the end of `<head>` resolves the phase
from the clock and writes it to `<html data-charter-phase>`, before anything
paints, so there is no flash of the wrong copy. Each variant block carries
`data-when="<phase> …"` and a short CSS rule hides the ones that do not match.

**Keeping it in step.** The three boundary instants live in that script and
nowhere else on this page. They are masa-app's `src/lib/charter.dates.ts`,
which owns the calendar per ADR-0357, and they agree with masa-tools'
`WAITLIST_PHASES` to the millisecond. **If the calendar moves, move it here in
the same change** — nothing checks the two repositories against each other,
because neither is checked out beside the other.

Every boundary is written with its `-07:00` offset so it parses to one absolute
instant. Do not rewrite them as bare local dates; a visitor in Sydney would get
a different phase.

**`node scripts/check-charter-phase.mjs`** checks the page on its own terms, no
dependencies: that every boundary carries an offset and they are in order, that
the phase is right one millisecond either side of each one, that every
`data-when` names a real phase and every phase has copy, that the form is gone
in the two phases masa-tools expects no form in, and that waitlist copy is
gated out of the phases with no waitlist.

That last rule exists because it caught a real miss. Everything structural
passed while two lines still read "Everyone needs to join the waitlist for app
access" and "Why join early" after entries had stopped — found by looking at a
screenshot, not by any assertion. Phases switch block by block, so the failure
mode is the block somebody forgets to mark.

**With JavaScript off** the page shows the phase it shipped with, which is the
old hand-edited behaviour and no worse. Googlebot runs the script, so the
indexed copy is the live one.

## Search Console

Nothing in this repo can do this part: verification needs a Google account and
a DNS record, neither of which is in version control. These are the steps, in
order. **Owner:** Bella. **Last validated:** 2026-09-19, walked end to end —
Domain property created, verified by DNS TXT in Cloudflare, sitemap submitted,
first crawl requested. Steps 1–4 are done and are not repeated; step 5 is the
one-week check.

**The property is owned by `admin@masa.life`, with `bella@masa.life` added as
a Full user.** Company account owns it so the property survives any one
person's account; Full lets Bella do everything day to day without being able
to add or remove users. Google sends coverage, manual-action and security
alerts to the owner, so `admin@` is the address that has to reach someone.

Ownership is recoverable rather than precious: verification is by DNS, so
anyone who controls `masa.life`'s DNS can verify a further account, each owner
holding its own TXT record alongside the others. Nothing has to be torn down
to add one.

1. **Create a Domain property**, not a URL-prefix one, at
   [search.google.com/search-console](https://search.google.com/search-console).
   Enter `masa.life` with no scheme and no `www`. A Domain property covers
   `www`, `app.` and `dev.`, and both http and https, as one property — a URL
   prefix property would cover only the exact string and would need a separate
   property per subdomain.
2. **Verify by DNS.** Domain properties support only this method. Google shows
   a `google-site-verification=…` string; add it in Cloudflare under
   `masa.life` → DNS → Records → Add record, type `TXT`, name `@`, content set
   to that whole string. TXT records are not proxied, so the orange cloud does
   not apply. Cloudflare publishes in seconds; click Verify. If it fails, wait
   a few minutes and retry rather than adding a second record.
3. **Submit the sitemap.** Sitemaps → enter the **full URL**,
   `https://masa.life/sitemap.xml` → Submit. It should read "Success" and 1
   discovered URL.

   The relative path `sitemap.xml` is what a *URL-prefix* property wants,
   because that kind of property shows its origin greyed out in front of the
   field. A Domain property covers http, https and every subdomain, so it has
   no single prefix to show and the field starts empty. This step said
   "relative path" until 2026-09-19, which is the URL-prefix instruction
   sitting next to the Domain-property setup in step 1.
4. **Request the first crawl.** URL Inspection → `https://masa.life/` → Request
   Indexing. Without this the first crawl of a brand-new property can take
   days. It is a one-off, not something to repeat on every copy change.
5. **Check back in a week**, under Pages, that `masa.life/` is Indexed and not
   "Discovered — currently not indexed".

Two things to expect once the property exists:

- **`dev.masa.life` will appear in it.** The development environment serves no
  `robots.txt`, no `noindex` and no `X-Robots-Tag`, so if it is publicly
  reachable it is indexable, and a dev copy of the product in Google's index
  competes with production for its own brand terms. Worth closing before
  verification, not after.
- **No verification file or meta tag belongs in this repo.** DNS verification
  needs neither, and a stale `google*.html` or `google-site-verification` meta
  tag left in the page is a small information leak for no benefit.

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
