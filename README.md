# masa.life — holding page

Single static page on the `.life` apex. Brand-correct, quiet, no funnel.

Source of truth for the spec: ADR-0089 (to be added at cutover) and the
approved plan in `plan.md`.

## What it is

`index.html` only. Inline SVG logo, inline CSS, one Google Fonts request,
no JS, no analytics. `<meta name="robots" content="noindex, nofollow">`
so it does not compete with `masalife.app` in search.

## Deploy (one-time, today)

### 1. New GitHub repo

Create an empty repo called `masalife-co-holding` and commit these three
files at the root:

- `index.html`
- `_headers`
- `README.md`

(Copy them out of `docs/marketing/masalife-co/`)

### 2. Cloudflare account

- Add `masa.life` as a site on Cloudflare (Free plan is fine).
- Cloudflare will give you two nameservers (e.g.
  `xxx.ns.cloudflare.com`).

### 4. Cloudflare Pages

- Create Pages project → connect to the `masalife-co-holding` GitHub
  repo → no build command, output directory `/`.
- Pages → Custom domains → add `masalife.co` and `www.masalife.co`.
- Cloudflare issues the TLS cert automatically.

### 5. Verify

- `curl -I https://masa.life` → 200, headers from `_headers`
  applied.
- Page renders Warm Mist background, Deep Blue wordmark, one line of
  copy, one mailto link. Nothing else.

## Before shipping

- [ ] Confirm `hello@masa.life` (or whichever inbox is chosen) is
      live and monitored. Search `index.html` for the `TODO` comment.

## 6/13 cutover (masa.life)

When `masa.life` lands, switch this surface from a holding page to a
301 redirect to the `masa.life` apex. Two options:

1. **Cloudflare Page Rule** — `masalife.co/*` → `https://masa.life/$1`,
   301 forward. Repo stays archived as a fallback.
2. **DNS-level redirect** at registrar — simpler, but loses the
   archived-page fallback.

Recommend option 1. Captured in a new ADR at cutover, referenced from
ADR-0071.

## Brand tokens (must match app)

- `#2E4A6B` Deep Blue — wordmark, links
- `#F3EFEA` Warm Mist — background
- `#8FA3BE` / `#B6CAE0` — logo embrace halves
- Cormorant Garamond 500 — wordmark
- Inter 400 — body line + mailto

## What this page intentionally does NOT have

No waitlist. No analytics. No og:image. No nav. No footer. No mention
of IVF, loss, 2WW, beta, or Founding 500. No link to `masalife.app`.
No "built by someone who lived this." All of that belongs on the
product, not on a parking sign.
