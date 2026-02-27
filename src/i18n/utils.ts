import type { Language } from './translations';

const SUPPORTED_LANGUAGES: Language[] = ['de', 'en'];
const DEFAULT_LANGUAGE: Language = 'de';

/**
 * Extracts the language from a URL path.
 * E.g., /en/apartments → 'en', /de/wohnungen → 'de', / → 'de'
 */
export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (SUPPORTED_LANGUAGES.includes(lang as Language)) {
    return lang as Language;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Strips the language prefix from a URL path.
 * E.g., /de/wohnungen/rheinblick → /wohnungen/rheinblick
 */
export function getRouteFromUrl(url: URL): string {
  const [, lang, ...rest] = url.pathname.split('/');
  if (SUPPORTED_LANGUAGES.includes(lang as Language)) {
    return '/' + rest.join('/');
  }
  return url.pathname;
}

/** Route mapping between DE and EN paths */
const routeMap: Record<string, Record<Language, string>> = {
  apartments: { de: 'wohnungen', en: 'apartments' },
  guides: { de: 'guides', en: 'guides' },
  contact: { de: 'kontakt', en: 'contact' },
  imprint: { de: 'impressum', en: 'imprint' },
  privacy: { de: 'datenschutz', en: 'privacy' },
  faq: { de: 'faq', en: 'faq' },
  exchangeStudents: { de: 'austauschstudierende', en: 'exchange-students' },
};

/**
 * Builds a localized URL path for the given language.
 * E.g., translatePath('/wohnungen/rheinblick', 'en') → '/en/apartments/rheinblick'
 */
export function translatePath(path: string, lang: Language): string {
  // Strip any existing language prefix
  const stripped = path.replace(/^\/(de|en)/, '');
  const segments = stripped.split('/').filter(Boolean);

  if (segments.length === 0) {
    return `/${lang}/`;
  }

  // Translate the first segment if it's a known route
  const firstSegment = segments[0];
  const translatedSegments = [...segments];

  for (const [, mapping] of Object.entries(routeMap)) {
    const values = Object.values(mapping);
    if (values.includes(firstSegment)) {
      translatedSegments[0] = mapping[lang];
      break;
    }
  }

  return `/${lang}/${translatedSegments.join('/')}`;
}
