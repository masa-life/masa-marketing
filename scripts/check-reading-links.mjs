#!/usr/bin/env node
/**
 * The public Learn and tool links are written four times: the homepage list,
 * the /reading list, and an ItemList in each page's JSON-LD. This checks
 * those four copies are the same list, that the homepage is indexable, and
 * that the sitemap names every page on this host.
 *
 *   node scripts/check-reading-links.mjs
 *
 * It does not fetch the app. A URL is added here only after someone has seen
 * it return 200 with no noindex. /login is refused on purpose: Bing already
 * ranks that sign-in page for the brand, and the fix belongs in masadev.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(ROOT, name), "utf8");

const failures = [];
const check = (label, condition, detail) => {
  if (condition) return;
  failures.push(detail ? `${label}\n      ${detail}` : label);
};

function publicHrefs(html) {
  const blocks = [...html.matchAll(/<ul class="public-links"[^>]*>[\s\S]*?<\/ul>/g)];
  check("page has public-links lists", blocks.length > 0);
  return blocks.flatMap((block) => [...block[0].matchAll(/href="(https:\/\/app\.masa\.life\/[^"]+)"/g)].map((m) => m[1]));
}

function itemListUrls(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const urls = [];
  for (const block of blocks) {
    let data;
    try {
      data = JSON.parse(block[1]);
    } catch (error) {
      check("JSON-LD parses", false, error.message);
      continue;
    }
    for (const node of data["@graph"] ?? []) {
      if (node["@type"] !== "ItemList") continue;
      for (const item of node.itemListElement ?? []) urls.push(item.url);
    }
  }
  return urls;
}

const index = read("index.html");
const reading = read("reading.html");
const lists = {
  "homepage html": publicHrefs(index),
  "reading html": publicHrefs(reading),
  "homepage JSON-LD": itemListUrls(index),
  "reading JSON-LD": itemListUrls(reading),
};

const [firstName, first] = Object.entries(lists)[0];
for (const [name, urls] of Object.entries(lists)) {
  check(
    `${name} matches ${firstName} (${first.length} urls)`,
    urls.length === first.length && urls.every((url, i) => url === first[i]),
    urls.filter((url) => !first.includes(url)).concat(first.filter((url) => !urls.includes(url))).join(", "),
  );
}

const required = [
  "https://app.masa.life/learn",
  "https://app.masa.life/learn/glossary",
  "https://app.masa.life/tools",
  "https://app.masa.life/tools/hospital-bag",
  "https://app.masa.life/tools/birth-plan",
];
for (const url of required) {
  check(`list includes ${url}`, first.includes(url));
}

for (const url of first) {
  check(
    `${url} is a public learn or tools URL`,
    /^https:\/\/app\.masa\.life\/(learn|tools)(\/|$)/.test(url),
  );
  check(`${url} is not the sign-in page`, !url.includes("/login"));
  check(`${url} is not the member birth-plan route`, !url.includes("/pregnancy/"));
}

check("homepage has one h1", (index.match(/<h1\b/g) ?? []).length === 1);
check(
  "homepage title is a Masa brand title",
  /<title>Masa — [^<]+<\/title>/.test(index),
);
check("homepage has a meta description", /<meta\s+name="description"\s+content="[^"]+"/.test(index));
check('homepage canonical is https://masa.life/', /<link rel="canonical" href="https:\/\/masa\.life\/"/.test(index));
check(
  "homepage robots is index, follow",
  /<meta name="robots" content="index, follow"/.test(index),
);
check(
  "homepage has no noindex meta",
  !/name="robots"[^>]*content="[^"]*noindex/.test(index),
);

const sitemap = read("sitemap.xml");
for (const loc of ["https://masa.life/", "https://masa.life/reading", "https://masa.life/accessibility", "https://masa.life/privacy"]) {
  check(`sitemap lists ${loc}`, sitemap.includes(`<loc>${loc}</loc>`));
}
check("sitemap does not list the sign-in page", !sitemap.includes("/login"));

const robots = read("robots.txt");
check("robots allows crawling", /User-agent: \*\nAllow: \//.test(robots));
check("robots points at this sitemap", robots.includes("Sitemap: https://masa.life/sitemap.xml"));
check("robots points at the app sitemap", robots.includes("Sitemap: https://app.masa.life/sitemap.xml"));
check("robots has no Disallow", !/^\s*Disallow:/m.test(robots));

if (failures.length) {
  console.error(`check-reading-links: ${failures.length} failure(s)\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`check-reading-links: ${first.length} public urls agree, homepage is indexable`);
