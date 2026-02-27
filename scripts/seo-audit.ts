import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DIST_DIR = join(ROOT, 'dist');

const errors: string[] = [];
const warnings: string[] = [];

function walk(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      result.push(...walk(fullPath));
    } else {
      result.push(fullPath);
    }
  }
  return result;
}

function assert(condition: boolean, message: string): void {
  if (!condition) errors.push(message);
}

function normalized(text: string): string {
  return text.replace(/\s+/g, '');
}

if (!existsSync(DIST_DIR)) {
  console.error('dist/ not found. Run `npm run build` before `npm run seo:audit`.');
  process.exit(1);
}

const allFiles = walk(DIST_DIR);
const htmlFiles = allFiles
  .filter((filePath) => filePath.endsWith('.html'))
  .filter((filePath) => !filePath.includes('/admin/'));

for (const filePath of htmlFiles) {
  const rel = relative(DIST_DIR, filePath);
  const html = readFileSync(filePath, 'utf-8');

  const titleCount = [...html.matchAll(/<title>[\s\S]*?<\/title>/gi)].length;
  assert(titleCount === 1, `[${rel}] expected exactly one <title>, found ${titleCount}.`);

  const descriptionCount = [...html.matchAll(/<meta[^>]+name=["']description["'][^>]*>/gi)].length;
  assert(descriptionCount === 1, `[${rel}] expected exactly one meta description, found ${descriptionCount}.`);

  const canonicalMatches = [...html.matchAll(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];
  assert(canonicalMatches.length === 1, `[${rel}] expected exactly one canonical URL.`);
  if (canonicalMatches.length === 1) {
    assert(/^https?:\/\//.test(canonicalMatches[0][1]), `[${rel}] canonical URL must be absolute.`);
  }

  const hasNoindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  if (!hasNoindex) {
    const hreflangs = [...html.matchAll(/<link[^>]+rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
    assert(hreflangs.includes('de'), `[${rel}] missing hreflang=de.`);
    assert(hreflangs.includes('en'), `[${rel}] missing hreflang=en.`);
    assert(hreflangs.includes('x-default'), `[${rel}] missing hreflang=x-default.`);
  }

  const compact = normalized(html);
  if (rel === join('de', 'index.html') || rel === join('en', 'index.html')) {
    assert(compact.includes('"@type":"WebSite"'), `[${rel}] missing WebSite JSON-LD.`);
    assert(compact.includes('"@type":"RealEstateAgent"'), `[${rel}] missing LocalBusiness/RealEstateAgent JSON-LD.`);
  }

  if (rel === join('de', 'faq', 'index.html') || rel === join('en', 'faq', 'index.html')) {
    assert(compact.includes('"@type":"FAQPage"'), `[${rel}] missing FAQPage JSON-LD.`);
  }

  if (rel.includes('de/wohnungen/') || rel.includes('en/apartments/')) {
    assert(compact.includes('"@type":"Apartment"'), `[${rel}] missing Apartment JSON-LD.`);
    assert(compact.includes('"@type":"Offer"'), `[${rel}] missing Offer JSON-LD.`);
  }

  if (
    rel === join('de', 'impressum', 'index.html') ||
    rel === join('de', 'datenschutz', 'index.html') ||
    rel === join('en', 'imprint', 'index.html') ||
    rel === join('en', 'privacy', 'index.html')
  ) {
    assert(/<meta[^>]+name=["']robots["'][^>]*content=["']noindex,follow["']/i.test(html), `[${rel}] expected noindex,follow robots meta.`);
  }
}

const robotsPath = join(DIST_DIR, 'robots.txt');
assert(existsSync(robotsPath), 'robots.txt missing from dist output.');
if (existsSync(robotsPath)) {
  const robots = readFileSync(robotsPath, 'utf-8');
  assert(/Disallow:\s*\/admin\//i.test(robots), 'robots.txt must disallow /admin/.');
  assert(/Sitemap:\s*https?:\/\/.+\/sitemap-index\.xml/i.test(robots), 'robots.txt must contain an absolute sitemap-index URL.');
}

const sitemapIndexPath = join(DIST_DIR, 'sitemap-index.xml');
assert(existsSync(sitemapIndexPath), 'sitemap-index.xml missing from dist output.');
if (existsSync(sitemapIndexPath)) {
  const sitemapIndex = readFileSync(sitemapIndexPath, 'utf-8');
  assert(/<loc>https?:\/\/.+\/sitemap\.xml<\/loc>/i.test(sitemapIndex), 'sitemap-index.xml must reference sitemap.xml with an absolute URL.');
}

const sitemapPath = join(DIST_DIR, 'sitemap.xml');
assert(existsSync(sitemapPath), 'sitemap.xml missing from dist output.');
if (existsSync(sitemapPath)) {
  const sitemap = readFileSync(sitemapPath, 'utf-8');
  assert(/hreflang="de"/.test(sitemap), 'sitemap.xml missing hreflang=de links.');
  assert(/hreflang="en"/.test(sitemap), 'sitemap.xml missing hreflang=en links.');
  assert(/hreflang="x-default"/.test(sitemap), 'sitemap.xml missing hreflang=x-default links.');

  const disallowedPaths = ['/de/impressum/', '/de/datenschutz/', '/en/imprint/', '/en/privacy/'];
  for (const path of disallowedPaths) {
    if (sitemap.includes(path)) {
      warnings.push(`sitemap.xml currently includes noindex path ${path}.`);
    }
  }
}

console.log('=== SEO Audit ===');
console.log(`HTML files audited: ${htmlFiles.length}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

for (const warning of warnings) {
  console.log(`⚠ ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.log(`✗ ${error}`);
  }
  process.exit(1);
}

console.log('✓ SEO audit passed');
