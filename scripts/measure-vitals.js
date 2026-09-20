#!/usr/bin/env node
/**
 * Measure this page's Core Web Vitals locally, so a change to the head can be
 * argued from numbers instead of from instinct.
 *
 *   npm install playwright          # or: npx playwright@latest install chromium
 *   node scripts/measure-vitals.js [runs]
 *
 * It serves the repo over loopback, brotli-compressing the HTML the way
 * Cloudflare does — raw HTML is five times the bytes and unfairly penalises
 * anything competing with the document for bandwidth — then loads it in
 * Chromium under Slow 4G with a 4x CPU throttle, the profile Lighthouse scores
 * mobile on. It reports the median of N runs at phone and desktop widths, plus
 * which element the largest contentful paint actually was.
 *
 * One run of a throttled page is far too noisy to conclude anything from. The
 * default of 7 is the point where the medians stopped moving between runs.
 *
 * Thresholds Google calls "good": LCP under 2500ms, CLS under 0.1.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('playwright is not installed here. `npm install playwright`, then re-run.');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const RUNS = Number(process.argv[2] || 7);
const TYPES = {
  '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2',
  '.xml': 'application/xml', '.txt': 'text/plain',
};

// Some Chromium builds ship outside the playwright download cache.
const PREINSTALLED = '/opt/pw-browsers/chromium';
const launchOpts = { args: ['--no-sandbox'] };
if (fs.existsSync(PREINSTALLED)) launchOpts.executablePath = PREINSTALLED;

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end('not found');
      }
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      if (type === 'text/html') {
        const body = zlib.brotliCompressSync(fs.readFileSync(file));
        res.writeHead(200, { 'Content-Type': type, 'Content-Encoding': 'br' });
        return res.end(body);
      }
      res.writeHead(200, { 'Content-Type': type });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const COLLECT = `
  window.__lcp = null; window.__cls = 0; window.__firstShift = null;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      window.__lcp = { t: e.startTime, tag: e.element ? e.element.tagName : null,
                       text: e.element ? (e.element.textContent || '').trim().slice(0, 40) : null };
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__cls += e.value;
      if (e.value > 0.0005 && window.__firstShift === null) window.__firstShift = e.startTime;
    }
  }).observe({ type: 'layout-shift', buffered: true });
`;

async function once(port, viewport, mobile) {
  const browser = await chromium.launch(launchOpts);
  const ctx = await browser.newContext({ viewport, isMobile: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await ctx.newPage();
  await page.addInitScript(COLLECT);

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const out = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, shift: window.__firstShift }));
  await browser.close();
  return out;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const verdict = (lcp, cls) => (lcp < 2500 && cls < 0.1 ? 'good' : 'NEEDS WORK');

(async () => {
  const server = await serve();
  const port = server.address().port;
  console.log(`median of ${RUNS} runs, Slow 4G + 4x CPU, HTML brotli'd as Cloudflare serves it\n`);

  for (const [label, vp, mob] of [
    ['phone   390x844 ', { width: 390, height: 844 }, true],
    ['desktop 1280x800', { width: 1280, height: 800 }, false],
  ]) {
    const lcps = [], clss = [], shifts = [];
    let element = null;
    for (let i = 0; i < RUNS; i++) {
      const r = await once(port, vp, mob);
      if (r.lcp) { lcps.push(r.lcp.t); element = `<${r.lcp.tag}> ${JSON.stringify(r.lcp.text)}`; }
      clss.push(r.cls);
      if (r.shift != null) shifts.push(r.shift);
    }
    const lcp = median(lcps), cls = median(clss);
    console.log(
      `${label}  LCP ${lcp.toFixed(0).padStart(5)}ms   CLS ${cls.toFixed(4)}   ` +
      `first shift ${shifts.length ? median(shifts).toFixed(0) + 'ms' : 'none'}   ${verdict(lcp, cls)}`
    );
    console.log(`${' '.repeat(18)}LCP element ${element}\n`);
  }
  server.close();
})();
