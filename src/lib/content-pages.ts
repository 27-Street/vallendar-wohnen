import { getCollection, type CollectionEntry } from 'astro:content';

export type ContentLocale = 'de' | 'en';
export type ContentPageEntry = CollectionEntry<'pages'>;

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/^\/+|\/+$/g, '');

export const getPageSlug = (page: ContentPageEntry, locale: ContentLocale): string => {
  const localized = page.data.routeSlug?.[locale];
  if (localized && localized.trim()) return normalizeSlug(localized);

  return normalizeSlug(page.id);
};

export async function getContentPages(): Promise<ContentPageEntry[]> {
  const pages = await getCollection('pages');
  return pages.filter((page) => page.data.kind === 'content');
}

export async function getContentPageBySlug(
  locale: ContentLocale,
  slug: string,
): Promise<ContentPageEntry | undefined> {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return undefined;

  const contentPages = await getContentPages();
  return contentPages.find((page) => getPageSlug(page, locale) === normalizedSlug);
}

export async function getCanonicalFaqPage(): Promise<ContentPageEntry | undefined> {
  const contentPages = await getContentPages();
  const faqPages = contentPages.filter((page) => page.data.pageType === 'faq');
  if (faqPages.length === 0) return undefined;

  return faqPages.find((page) => (
    getPageSlug(page, 'de') === 'faq' && getPageSlug(page, 'en') === 'faq'
  )) ?? faqPages[0];
}
