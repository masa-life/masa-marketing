#!/usr/bin/env node
/**
 * Checks the launch-phase switching in index.html.
 *
 *   node scripts/check-charter-phase.mjs
 *
 * No dependencies, no browser. It parses the three boundary instants out of
 * the page's own inline script and then asserts things that are cheap to get
 * wrong and expensive to discover on the night of October 3.
 *
 * What it will not do is compare the dates against masa-app, which owns the
 * calendar. That repository is not checked out beside this one and this page
 * is a static site with no dependency on it. So this proves the page is
 * self-consistent; keeping it in step with `charter.dates.ts` is a human
 * reading two files, and the comment above those constants says so.
 *
 * Exit codes: 0 all checks pass, 1 a check failed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");

const PHASES = ["before-waitlist", "waitlist-open", "waitlist-closed", "public-open"];

const failures = [];
const check = (label, condition, detail) => {
  if (condition) return;
  failures.push(detail ? `${label}\n      ${detail}` : label);
};

// ---- The boundaries, read from the page rather than repeated here. ----
function instant(name) {
  const match = html.match(new RegExp(`var ${name} = Date\\.parse\\('([^']+)'\\)`));
  if (!match) throw new Error(`${name} is not in index.html — did the script change shape?`);
  return { raw: match[1], at: Date.parse(match[1]) };
}

const opens = instant("OPENS_AT");
const closes = instant("CLOSES_AT");
const publicOpens = instant("PUBLIC_OPENS_AT");

for (const { raw } of [opens, closes, publicOpens]) {
  // Without an offset the instant means something different in every time
  // zone the page is read in, which is the whole bug this guards.
  check(
    `boundary "${raw}" carries an explicit UTC offset`,
    /[+-]\d{2}:\d{2}$/.test(raw),
    "write it as 2026-10-04T00:00:00-07:00, never as a bare local date",
  );
}

check("boundaries are in order", opens.at < closes.at && closes.at < publicOpens.at);

// ---- The resolver, reimplemented here so the boundaries are tested from
// outside the page rather than by running its own copy against itself. ----
const phaseAt = (t) =>
  t < opens.at
    ? "before-waitlist"
    : t < closes.at
      ? "waitlist-open"
      : t < publicOpens.at
        ? "waitlist-closed"
        : "public-open";

// One millisecond either side of every boundary: the off-by-one that would
// leave the form up for an extra day, or take it down a day early.
const boundaries = [
  [opens.at - 1, "before-waitlist"],
  [opens.at, "waitlist-open"],
  [closes.at - 1, "waitlist-open"],
  [closes.at, "waitlist-closed"],
  [publicOpens.at - 1, "waitlist-closed"],
  [publicOpens.at, "public-open"],
];
for (const [t, expected] of boundaries) {
  check(
    `${new Date(t).toISOString()} is ${expected}`,
    phaseAt(t) === expected,
    `got ${phaseAt(t)}`,
  );
}

// A visitor's time zone must not change the answer. Same instant, two clocks.
check(
  "the phase is the same instant everywhere",
  phaseAt(Date.parse("2026-10-04T00:00:00-07:00")) ===
    phaseAt(Date.parse("2026-10-04T17:00:00+10:00")),
);

// ---- The markup. ----
const used = [...html.matchAll(/data-when="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
for (const name of new Set(used)) {
  check(`data-when="${name}" is a real phase`, PHASES.includes(name), `known: ${PHASES.join(", ")}`);
}

// Every phase needs something to show, or it renders a hole.
for (const phase of PHASES) {
  check(`${phase} has copy of its own`, used.includes(phase));
}

// The shipped default has to be a phase the CSS can match, or nothing is
// hidden and every variant shows at once with JavaScript off.
const shipped = html.match(/<html lang="en" data-charter-phase="([^"]+)"/)?.[1];
check(`<html> ships a real phase (got ${shipped ?? "none"})`, PHASES.includes(shipped));

// The rule is written out once per phase; a missing one silently shows all.
for (const phase of PHASES) {
  check(
    `CSS hides non-matching blocks in ${phase}`,
    html.includes(`html[data-charter-phase='${phase}'] [data-when]:not([data-when~='${phase}'])`),
  );
}

/**
 * Copy that talks about joining a waitlist must not survive into the phases
 * where there is no waitlist to join.
 *
 * This is the check that earns its keep. Everything above is structural and
 * passed happily while two lines in the Charter panel still read "Everyone
 * needs to join the waitlist for app access" and "Why join early" after
 * entries had stopped — found by looking at a screenshot, not by any
 * assertion. Phases are switched block by block, so it is the block somebody
 * forgets to mark that goes stale, and it will always be a block that mentions
 * the waitlist.
 *
 * Scoped to the Charter panel and the hero, where the dated copy lives, and to
 * leaf elements so a wrapper is not blamed for its children.
 */
const WAITLIST_PHRASES = [/join the waitlist/i, /join early/i, /waitlist open/i];
const leaves = [...html.matchAll(/<(p|div|a|h\d|li|span)\b([^>]*)>([^<]*)<\/\1>/g)];
for (const [, , attrs, text] of leaves) {
  if (!WAITLIST_PHRASES.some((re) => re.test(text))) continue;
  const when = attrs.match(/data-when="([^"]+)"/)?.[1];
  const phases = when ? when.split(/\s+/) : PHASES; // ungated means every phase
  const leaked = phases.filter((p) => p === "waitlist-closed" || p === "public-open");
  check(
    `waitlist copy is gated out of the phases with no waitlist`,
    leaked.length === 0,
    `"${text.trim().slice(0, 70)}…" shows in ${leaked.join(", ")}`,
  );
}

// The form must not survive into the phases where masa-tools expects no form.
const formTag = html.match(/<form id="waitlist-form"[^>]*>/)?.[0] ?? "";
const formWhen = formTag.match(/data-when="([^"]+)"/)?.[1] ?? "";
for (const phase of ["waitlist-closed", "public-open"]) {
  check(
    `the waitlist form is gone in ${phase}`,
    !formWhen.split(/\s+/).includes(phase),
    `form carries data-when="${formWhen}"`,
  );
}

if (failures.length) {
  console.error(`check-charter-phase: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log("check-charter-phase: all checks pass");
console.log(`  waitlist opens  ${opens.raw}`);
console.log(`  entries stop    ${closes.raw}`);
console.log(`  public opening  ${publicOpens.raw}`);
console.log(`  phase today     ${phaseAt(Date.now())}`);
