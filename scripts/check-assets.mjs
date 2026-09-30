#!/usr/bin/env node
/**
 * Checks that a deploy would upload the site and nothing else.
 *
 *   node scripts/check-assets.mjs
 *
 * Run it before deploying, and after any change to `.assetsignore` or to the
 * files at the root. `wrangler.jsonc` points the asset upload at the whole
 * checkout, so `.assetsignore` is all that keeps `.git/`, the scripts and the
 * config off masa.life: delete or rename it and the next deploy serves them
 * again, with nothing else to say so.
 *
 * It asks wrangler itself rather than re-implementing its matcher: a
 * `deploy --dry-run` with debug logging names every path it ignores, and
 * everything else under the root is what would ship. That set has to equal
 * the pages below plus every tracked file under assets/. A new top-level page
 * therefore fails here until it is added both to `.assetsignore` and to PAGES.
 *
 * Needs network for `npx wrangler@4` (set WRANGLER to a local binary to skip
 * the download). That is the newest 4.x, which is not necessarily the version
 * Workers Builds deploys with; a matcher change between them would most likely
 * show here as a failure, not a false pass. Makes no deploy: --dry-run exits
 * before any upload.
 *
 * Exit codes: 0 the upload set is exactly the site, 1 it is not.
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html", "accessibility.html", "llms.txt", "robots.txt", "sitemap.xml"];

if (!existsSync(join(ROOT, ".assetsignore"))) {
  console.error("check-assets: .assetsignore is missing, so the whole checkout would ship");
  process.exit(1);
}

const outdir = mkdtempSync(join(tmpdir(), "check-assets-"));
// wrangler writes its bundle scratch inside the asset directory. Remove only
// what this run created, so a running `wrangler dev` keeps its own.
const scratch = join(ROOT, ".wrangler");
const hadScratch = existsSync(scratch);
const hadScratchTmp = existsSync(join(scratch, "tmp"));
const [cmd, args] = process.env.WRANGLER
  ? [process.env.WRANGLER, []]
  : ["npx", ["--yes", "wrangler@4"]];
let log;
try {
  log = execFileSync(cmd, [...args, "deploy", "--dry-run", "--outdir", outdir], {
    cwd: ROOT,
    env: { ...process.env, WRANGLER_LOG: "debug" },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
} finally {
  rmSync(outdir, { recursive: true, force: true });
  if (!hadScratch) rmSync(scratch, { recursive: true, force: true });
  else if (!hadScratchTmp) rmSync(join(scratch, "tmp"), { recursive: true, force: true });
}

const ignored = [...log.matchAll(/^Ignoring asset: (.+)$/gm)].map((m) => m[1].trim());
if (ignored.length === 0) {
  console.error("check-assets: wrangler reported no ignored paths; its log format may have changed");
  process.exit(1);
}
// wrangler tests, and logs, every path readdir returns, files and directories
// alike. A directory can be logged as ignored while its files ship (`*` matches
// `assets`, `!/assets/**` lets its contents back in), so match paths exactly.
const ignoredSet = new Set(ignored);
const candidates = readdirSync(ROOT, { recursive: true }).filter((p) => !ignoredSet.has(p));

// wrangler reads each path with fs.stat, which follows symlinks: a link under
// assets/ ships whatever it points at, .git/config included. Nothing on this
// site is a symlink, so any that would ship is a failure in itself.
const links = candidates.filter((p) => lstatSync(join(ROOT, p)).isSymbolicLink());
if (links.length) {
  console.error(`would ship through a symlink:\n  ${links.join("\n  ")}`);
  console.error("\ncheck-assets: the upload set is not the site");
  process.exit(1);
}

// Same test wrangler applies (stat, not lstat), so "shipped" is its set.
const shipped = candidates
  .filter((p) => statSync(join(ROOT, p)).isFile())
  .map((p) => p.split(sep).join("/"))
  .sort();
const expected = [
  ...PAGES,
  ...execFileSync("git", ["ls-files", "assets"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
].sort();

const extra = shipped.filter((p) => !expected.includes(p));
const missing = expected.filter((p) => !shipped.includes(p));
if (extra.length) console.error(`would ship but should not:\n  ${extra.join("\n  ")}`);
if (missing.length) console.error(`should ship but would not:\n  ${missing.join("\n  ")}`);
if (extra.length || missing.length) {
  console.error("\ncheck-assets: the upload set is not the site");
  process.exit(1);
}
console.log(`check-assets: ${shipped.length} files would ship, exactly the site`);
