import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { getSiteOrigin, normalizeCanonicalPath, toAbsoluteUrl } from '../lib/seo';

interface UrlEntry {
  loc: string;
  alternates: Array<{ hreflang: string; href: string }>;
  images?: string[];
  lastmod?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildStaticEntries(siteOrigin: string): UrlEntry[] {
  const pairs: Array<{ de: string; en: string }> = [
    { de: '/de/', en: '/en/' },
    { de: '/de/faq/', en: '/en/faq/' },
    { de: '/de/kontakt/', en: '/en/contact/' },
    { de: '/de/austauschstudierende/', en: '/en/exchange-students/' },
    { de: '/de/guides/', en: '/en/guides/' },
  ];

  return pairs.flatMap((pair) => {
    const deUrl = toAbsoluteUrl(siteOrigin, pair.de);
    const enUrl = toAbsoluteUrl(siteOrigin, pair.en);

    return [
      {
        loc: deUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
      },
      {
        loc: enUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
      },
    ];
  });
}

export async function GET({ site }: APIContext): Promise<Response> {
  const siteOrigin = getSiteOrigin(site);
  const entries: UrlEntry[] = [...buildStaticEntries(siteOrigin)];

  const apartments = await getCollection('apartments');
  for (const apartment of apartments) {
    const dePath = normalizeCanonicalPath(`/de/wohnungen/${apartment.id}`);
    const enPath = normalizeCanonicalPath(`/en/apartments/${apartment.id}`);
    const deUrl = toAbsoluteUrl(siteOrigin, dePath);
    const enUrl = toAbsoluteUrl(siteOrigin, enPath);
    const imageUrls = apartment.data.images.map((image) => toAbsoluteUrl(siteOrigin, image.image));

    entries.push(
      {
        loc: deUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
        images: imageUrls,
      },
      {
        loc: enUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
        images: imageUrls,
      },
    );
  }

  const guides = await getCollection('guides');
  for (const guide of guides) {
    const dePath = normalizeCanonicalPath(`/de/guides/${guide.id}`);
    const enPath = normalizeCanonicalPath(`/en/guides/${guide.id}`);
    const deUrl = toAbsoluteUrl(siteOrigin, dePath);
    const enUrl = toAbsoluteUrl(siteOrigin, enPath);
    const guideImages = guide.data.heroImage ? [toAbsoluteUrl(siteOrigin, guide.data.heroImage)] : undefined;

    entries.push(
      {
        loc: deUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
        images: guideImages,
        lastmod: guide.data.publishedAt,
      },
      {
        loc: enUrl,
        alternates: [
          { hreflang: 'de', href: deUrl },
          { hreflang: 'en', href: enUrl },
          { hreflang: 'x-default', href: deUrl },
        ],
        images: guideImages,
        lastmod: guide.data.publishedAt,
      },
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    entries.map((entry) => {
      const alternates = entry.alternates
        .map((alternate) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.hreflang)}" href="${escapeXml(alternate.href)}" />`)
        .join('\n');

      const images = (entry.images ?? [])
        .map((imageUrl) => `    <image:image><image:loc>${escapeXml(imageUrl)}</image:loc></image:image>`)
        .join('\n');

      const lastmod = entry.lastmod ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';

      return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n${alternates}${lastmod}${images ? `\n${images}` : ''}\n  </url>`;
    }).join('\n') +
    `\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
