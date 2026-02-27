import type { Language } from '../i18n/translations';
import { translatePath } from '../i18n/utils';

export interface AlternateLink {
  lang: 'de' | 'en' | 'x-default';
  href: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

const FALLBACK_SITE_ORIGIN = 'https://lucky-cucurucho-b639b6.netlify.app';

export function getSiteOrigin(site: URL | undefined): string {
  return site?.origin ?? FALLBACK_SITE_ORIGIN;
}

export function normalizeCanonicalPath(pathname: string): string {
  const [pathOnly] = pathname.split(/[?#]/);
  let normalized = pathOnly || '/';

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  const hasFileExtension = /\.[a-zA-Z0-9]+$/.test(normalized);
  if (normalized !== '/' && !hasFileExtension && !normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
}

export function toAbsoluteUrl(siteOrigin: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = normalizeCanonicalPath(pathOrUrl);
  return new URL(normalizedPath, siteOrigin).toString();
}

export function buildAlternates(pathname: string, siteOrigin: string): AlternateLink[] {
  const normalized = normalizeCanonicalPath(pathname);
  const dePath = translatePath(normalized, 'de');
  const enPath = translatePath(normalized, 'en');

  return [
    { lang: 'de', href: toAbsoluteUrl(siteOrigin, dePath) },
    { lang: 'en', href: toAbsoluteUrl(siteOrigin, enPath) },
    { lang: 'x-default', href: toAbsoluteUrl(siteOrigin, dePath) },
  ];
}

export function mergeAlternates(
  pathname: string,
  siteOrigin: string,
  alternates: Array<{ lang: string; href: string }> | undefined,
): AlternateLink[] {
  const defaultAlternates = buildAlternates(pathname, siteOrigin);
  if (!alternates || alternates.length === 0) return defaultAlternates;

  const map = new Map<AlternateLink['lang'], AlternateLink>();
  for (const alt of defaultAlternates) map.set(alt.lang, alt);

  for (const alt of alternates) {
    const normalizedLang = alt.lang === 'x-default' ? 'x-default' : alt.lang === 'de' ? 'de' : alt.lang === 'en' ? 'en' : null;
    if (!normalizedLang) continue;
    map.set(normalizedLang, {
      lang: normalizedLang,
      href: toAbsoluteUrl(siteOrigin, alt.href),
    });
  }

  return ['de', 'en', 'x-default'].map((lang) => map.get(lang as AlternateLink['lang'])!).filter(Boolean);
}

export function getRobotsDirectives(noindex: boolean | undefined, robots: string | undefined): string | undefined {
  if (robots?.trim()) return robots.trim();
  if (noindex) return 'noindex,follow';
  return undefined;
}

export function buildRobotsTxt(siteOrigin: string): string {
  const sitemapUrl = toAbsoluteUrl(siteOrigin, '/sitemap-index.xml');
  return [
    '# robots.txt for VallendarWohnen',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /admin/',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
}

export function buildOrganizationSchema(siteOrigin: string, lang: Language): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'VallendarWohnen',
    url: toAbsoluteUrl(siteOrigin, `/${lang}/`),
    email: 'info@vallendar-wohnen.de',
    telephone: '+4926194000000',
    description: lang === 'de'
      ? 'Möblierte Studentenwohnungen in Vallendar, direkt gegenüber der WHU.'
      : 'Furnished student apartments in Vallendar, right across from WHU.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Musterstraße 1',
      addressLocality: 'Vallendar',
      postalCode: '56179',
      addressCountry: 'DE',
    },
  };
}

export function buildLocalBusinessSchema(siteOrigin: string, lang: Language): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': toAbsoluteUrl(siteOrigin, '/#organization'),
    name: 'VallendarWohnen',
    url: toAbsoluteUrl(siteOrigin, `/${lang}/`),
    image: toAbsoluteUrl(siteOrigin, '/og-default.png'),
    telephone: '+4926194000000',
    email: 'info@vallendar-wohnen.de',
    priceRange: '€€',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Musterstraße 1',
      addressLocality: 'Vallendar',
      postalCode: '56179',
      addressCountry: 'DE',
    },
    areaServed: ['Vallendar', 'Koblenz'],
  };
}

export function buildWebsiteSchema(siteOrigin: string, lang: Language): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'VallendarWohnen',
    url: toAbsoluteUrl(siteOrigin, `/${lang}/`),
    inLanguage: lang === 'de' ? 'de-DE' : 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${toAbsoluteUrl(siteOrigin, `/${lang}/`)}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildFaqPageSchema(pageUrl: string, items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
    url: pageUrl,
  };
}
