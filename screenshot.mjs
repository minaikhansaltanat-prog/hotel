import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);

function nextIndex() {
  const files = fs.readdirSync(outDir).filter(f => /^screenshot-\d+/.test(f));
  const nums = files.map(f => parseInt(f.match(/^screenshot-(\d+)/)[1], 10));
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const n = nextIndex();
const fileName = `screenshot-${n}${label ? '-' + label : ''}.png`;
const outPath = path.join(outDir, fileName);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width, height });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 400));

// Scroll through the full page first so scroll-triggered reveal animations fire
// before the full-page screenshot is captured.
await page.evaluate(async () => {
  const step = Math.max(200, Math.floor(window.innerHeight * 0.85));
  let y = 0;
  const max = document.body.scrollHeight;
  while (y < max) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 180));
    y += step;
  }
  window.scrollTo(0, max);
  await new Promise(r => setTimeout(r, 300));
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 200));
  // Safety net: force-reveal anything the observer missed during the fast
  // scripted scroll (real users scrolling at normal speed won't need this).
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
});
await new Promise(r => setTimeout(r, 300));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved: ${outPath}`);
