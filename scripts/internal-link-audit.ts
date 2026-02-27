import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DIST_DIR = join(ROOT, 'dist');
const SITE_ORIGIN = 'https://audit.local';

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function toRoutePath(filePath: string): string {
  const rel = relative(DIST_DIR, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.replace(/\/index\.html$/, '')}/`;
  return `/${rel}`;
}

function normalizeRoute(pathname: string): string {
  if (pathname === '/') return '/';
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) return pathname;
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function extractLinks(html: string): string[] {
  return [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]);
}

if (!existsSync(DIST_DIR)) {
  console.error('dist/ is missing. Run `npm run build` before this audit.');
  process.exit(1);
}

const htmlFiles = walk(DIST_DIR).filter((file) => file.endsWith('.html') && !file.includes('/admin/'));
const htmlByRoute = new Map<string, string>();

for (const file of htmlFiles) {
  const route = toRoutePath(file);
  htmlByRoute.set(route, readFileSync(file, 'utf-8'));
}

const graph = new Map<string, Set<string>>();
const knownRoutes = new Set(htmlByRoute.keys());

for (const [route, html] of htmlByRoute.entries()) {
  const links = extractLinks(html);
  const edges = new Set<string>();

  for (const href of links) {
    if (!href || href.startsWith('#')) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;

    let resolvedPath: string;
    try {
      const base = new URL(route, SITE_ORIGIN);
      const resolved = new URL(href, base);
      if (resolved.origin !== SITE_ORIGIN) continue;
      resolvedPath = normalizeRoute(resolved.pathname);
    } catch {
      continue;
    }

    if (knownRoutes.has(resolvedPath)) {
      edges.add(resolvedPath);
    }
  }

  graph.set(route, edges);
}

const seeds = new Set<string>(['/', '/de/', '/en/']);
const visited = new Set<string>();
const queue = [...seeds].filter((seed) => knownRoutes.has(seed));

while (queue.length > 0) {
  const current = queue.shift()!;
  if (visited.has(current)) continue;
  visited.add(current);
  const outgoing = graph.get(current) ?? new Set<string>();
  for (const target of outgoing) {
    if (!visited.has(target)) {
      queue.push(target);
    }
  }
}

const ignoredOrphanCandidates = new Set<string>(['/']);
const orphanRoutes = [...knownRoutes]
  .filter((route) => !visited.has(route))
  .filter((route) => !ignoredOrphanCandidates.has(route))
  .sort();

const guideRoutes = [...knownRoutes].filter(
  (route) => (route.startsWith('/de/guides/') || route.startsWith('/en/guides/')) && route !== '/de/guides/' && route !== '/en/guides/',
);

const guideErrors: string[] = [];
for (const route of guideRoutes) {
  const html = htmlByRoute.get(route) ?? '';
  const requiredHousingLink = route.startsWith('/de/')
    ? /href=["']\/de\/#wohnungen["']/i
    : /href=["']\/en\/#apartments["']/i;
  const requiredContactLink = route.startsWith('/de/')
    ? /href=["']\/de\/kontakt\/?["']/i
    : /href=["']\/en\/contact\/?["']/i;

  if (!requiredHousingLink.test(html)) {
    guideErrors.push(`${route} missing apartment listing CTA link.`);
  }
  if (!requiredContactLink.test(html)) {
    guideErrors.push(`${route} missing contact CTA link.`);
  }
}

console.log('=== Internal Link Audit ===');
console.log(`Routes scanned: ${knownRoutes.size}`);
console.log(`Reachable routes: ${visited.size}`);
console.log(`Orphan routes: ${orphanRoutes.length}`);
console.log(`Guide CTA errors: ${guideErrors.length}`);

if (orphanRoutes.length > 0) {
  for (const route of orphanRoutes) {
    console.log(`✗ orphan route: ${route}`);
  }
}

if (guideErrors.length > 0) {
  for (const error of guideErrors) {
    console.log(`✗ ${error}`);
  }
}

if (orphanRoutes.length > 0 || guideErrors.length > 0) {
  process.exit(1);
}

console.log('✓ internal link audit passed');
