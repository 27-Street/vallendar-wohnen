import type { APIContext } from 'astro';
import { getSiteOrigin, toAbsoluteUrl } from '../lib/seo';

export function GET({ site }: APIContext): Response {
  const siteOrigin = getSiteOrigin(site);
  const sitemapUrl = toAbsoluteUrl(siteOrigin, '/sitemap.xml');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap>\n` +
    `    <loc>${sitemapUrl}</loc>\n` +
    `  </sitemap>\n` +
    `</sitemapindex>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
