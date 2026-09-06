# masalife.co — Apple enrollment landing page (temporary)

Single static page on the `.co` apex. This replaces the previous quiet holding page while `masalife.co` is used as the publicly available company website for Apple Developer Program enrollment.

Once `masa.life` is transferred to Masa Life, Inc., this page should be replaced with a Cloudflare Page Rule 301 → `https://masa.life/$1`, per ADR-0184.

## Files

- `index.html` — company landing page (inline CSS, small vanilla-JS nav highlighter and waitlist form).
- `assets/` — logo icon and app screenshot referenced by `index.html`.
- `_headers` — Cloudflare Pages security headers.

## What's on the page

- Company name: **Masa Life, Inc.**
- Nav, hero, about, offerings, Charter waitlist, founder's story, and contact sections.
- Charter waitlist form: front-end only — submitting shows a confirmation message but does not send or store the email anywhere yet. Wire it to a real capture mechanism before relying on it to collect signups.
- Contact email: `hello@masa.life`.
- Footer links: Privacy Policy, Terms of Service, Contact.
- No analytics.
- `index`able (the previous `noindex` has been removed so Apple can verify the site).

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
3. Attach `masalife.co` and `www.masalife.co` custom domains.
4. Verify `https://masalife.co` loads and WHOIS shows **Masa Life, Inc.** as the registrant.

## Email forwarding

Set up `hello@masalife.co` to forward to `hello@masa.life` so the contact address on this page lands in your main inbox. Once `masa.life` is transferred to the company, the page can be retired and all contact can point directly to `hello@masa.life`.

## Brand tokens

- `#4A4E5A` Slate Warm — wordmark, links
- `#F3EFEA` Warm Mist — background
- `#8FA3BE` / `#B6CAE0` — logo embrace halves
- Cormorant Garamond 500 — wordmark
- Inter 400/500 — body
