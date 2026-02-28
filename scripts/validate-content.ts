import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { APARTMENT_IMAGE_KIND_OPTIONS, FEATURE_ICON_OPTIONS } from '../src/content/cms-shared';
import {
  APARTMENT_REQUIRED_PREVIEW_PATHS,
  CONTENT_PAGE_REQUIRED_PREVIEW_PATHS,
  GUIDE_REQUIRED_PREVIEW_PATHS,
  HOME_REQUIRED_PREVIEW_PATHS,
} from '../src/lib/cms-preview/field-map';
import { RICH_TEXT_CONFIG_SIGNATURE } from '../src/lib/rich-text-config';

const ROOT = resolve(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT, 'public');
const APARTMENTS_DIR = join(ROOT, 'src/content/apartments');
const PAGES_DIR = join(ROOT, 'src/content/pages');
const SETTINGS_DIR = join(ROOT, 'src/content/settings');
const GUIDES_DIR = join(ROOT, 'src/content/guides');
const APARTMENTS_MEDIA_DIR = join(PUBLIC_DIR, 'images/apartments');
const HERO_MEDIA_DIR = join(PUBLIC_DIR, 'images/hero');
const PAGES_MEDIA_DIR = join(PUBLIC_DIR, 'images/pages');
const GUIDES_MEDIA_DIR = join(PUBLIC_DIR, 'images/guides');
const DECAP_CONFIG_PATH = join(ROOT, 'public/admin/config.yml');
const DECAP_ADMIN_INDEX_PATH = join(ROOT, 'public/admin/index.html');
const CMS_PREVIEW_HOME_ROUTE = join(ROOT, 'src/pages/cms-preview/home.astro');
const CMS_PREVIEW_APARTMENT_ROUTE = join(ROOT, 'src/pages/cms-preview/apartment.astro');
const CMS_PREVIEW_CONTENT_PAGE_ROUTE = join(ROOT, 'src/pages/cms-preview/content-page.astro');
const CMS_PREVIEW_GUIDE_ROUTE = join(ROOT, 'src/pages/cms-preview/guide.astro');
const CMS_PREVIEW_FRAME_PATH = join(ROOT, 'public/admin/preview-frame.js');

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'Must not be empty');

const bilingualString = z.object({
  de: nonEmptyString,
  en: nonEmptyString,
}).strict();

const seoSchema = z.object({
  title: bilingualString,
  description: bilingualString,
  ogImage: nonEmptyString.optional(),
  ogImageAlt: bilingualString.optional(),
  noindex: z.boolean().optional(),
  canonicalPath: nonEmptyString.optional(),
  keywords: z.array(nonEmptyString).optional(),
}).strict();

const optionalBilingualCaption = z.object({
  de: z.string().optional(),
  en: z.string().optional(),
}).strict();

const apartmentImageSchema = z.object({
  image: nonEmptyString,
  kind: z.enum(APARTMENT_IMAGE_KIND_OPTIONS),
  caption: optionalBilingualCaption.optional(),
  isPrimary: z.boolean().optional(),
}).strict();

const apartmentSchema = z.object({
  name: nonEmptyString,
  tagline: bilingualString,
  description: bilingualString,
  size: z.number().positive(),
  rooms: bilingualString,
  maxOccupants: z.number().int().positive(),
  pricePerMonth: z.number().positive(),
  utilitiesPerMonth: z.number().positive(),
  amenities: z.array(bilingualString).min(1),
  available: z.boolean(),
  availableFrom: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
    z.date(),
  ]).optional(),
  images: z.array(apartmentImageSchema).min(1),
  floor: bilingualString,
  order: z.number().int().positive(),
  seo: seoSchema.optional(),
}).strict();

const editorialBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('richText'),
    body: bilingualString,
  }).strict(),
  z.object({
    type: z.literal('callout'),
    title: bilingualString,
    body: bilingualString,
    tone: z.enum(['info', 'success', 'warning']),
  }).strict(),
  z.object({
    type: z.literal('ctaRow'),
    text: bilingualString,
    buttonLabel: bilingualString,
    buttonHref: bilingualString,
  }).strict(),
]);

const welcomeSpotlightSchema = z.object({
  eyebrow: bilingualString,
  headline: bilingualString,
  body: bilingualString,
  ctaLabel: bilingualString,
  ctaHref: bilingualString,
  image: nonEmptyString.optional(),
  imageAlt: bilingualString.optional(),
}).strict();

const homePageSchema = z.object({
  title: z.literal('home'),
  hero: z.object({
    headline: bilingualString,
    subheadline: bilingualString,
    cta: bilingualString,
    images: z.object({
      desktop: nonEmptyString,
      tablet: nonEmptyString,
      mobile: nonEmptyString,
    }).strict(),
  }).strict(),
  welcomeSpotlight: welcomeSpotlightSchema.optional(),
  sectionSubheadline: bilingualString,
  features: z.array(
    z.object({
      icon: z.enum(FEATURE_ICON_OPTIONS),
      label: bilingualString,
    }).strict(),
  ).min(1),
  editorialBlocks: z.array(editorialBlockSchema).optional(),
  seo: seoSchema.optional(),
}).strict();

const localizedSlugSchema = z.object({
  de: nonEmptyString,
  en: nonEmptyString,
}).strict();

const pageHighlightSchema = z.object({
  icon: nonEmptyString,
  title: bilingualString,
  description: bilingualString,
}).strict();

const pageSectionSchema = z.object({
  heading: bilingualString,
  body: bilingualString,
}).strict();

const faqItemSchema = z.object({
  question: bilingualString,
  answer: bilingualString,
}).strict();

const contentPageBaseSchema = z.object({
  kind: z.literal('content'),
  pageType: z.enum(['faq', 'exchange', 'standard']),
  title: nonEmptyString,
  routeSlug: localizedSlugSchema,
  heading: bilingualString.optional(),
  subheading: bilingualString.optional(),
  intro: bilingualString.optional(),
  highlights: z.array(pageHighlightSchema).optional(),
  whatsIncluded: bilingualString.optional(),
  aboutVallendar: bilingualString.optional(),
  remoteBooking: bilingualString.optional(),
  ctaText: bilingualString.optional(),
  sections: z.array(pageSectionSchema).optional(),
  faq: z.array(faqItemSchema).optional(),
  seo: seoSchema.optional(),
}).strict();

const faqContentPageSchema = contentPageBaseSchema.extend({
  pageType: z.literal('faq'),
  faq: z.array(faqItemSchema).min(1),
});

const exchangeContentPageSchema = contentPageBaseSchema.extend({
  pageType: z.literal('exchange'),
  heading: bilingualString,
  subheading: bilingualString,
  intro: bilingualString,
  highlights: z.array(pageHighlightSchema).min(1),
  whatsIncluded: bilingualString,
  aboutVallendar: bilingualString,
  remoteBooking: bilingualString,
  ctaText: bilingualString,
});

const standardContentPageSchema = contentPageBaseSchema.extend({
  pageType: z.literal('standard'),
  heading: bilingualString,
  sections: z.array(pageSectionSchema).min(1),
});

const guideSchema = z.object({
  title: bilingualString,
  description: bilingualString,
  excerpt: bilingualString,
  publishedAt: nonEmptyString,
  readingMinutes: z.number().int().positive(),
  category: z.enum(['exchange', 'living', 'logistics']),
  order: z.number().int().positive(),
  heroImage: nonEmptyString.optional(),
  sections: z.array(z.object({
    heading: bilingualString,
    body: bilingualString,
  }).strict()).min(1),
  faq: z.array(z.object({
    question: bilingualString,
    answer: bilingualString,
  }).strict()).optional(),
  seo: seoSchema.optional(),
}).strict();

const settingsSchema = z.object({
  propertyName: nonEmptyString,
  propertyNameAccent: nonEmptyString,
  address: z.object({
    street: nonEmptyString,
    city: nonEmptyString,
  }).strict(),
  email: z.string().email(),
  phone: nonEmptyString,
  phoneDisplay: nonEmptyString,
}).strict();

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

function extractFrontmatter(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`No YAML frontmatter found in ${filePath}`);
  }
  return parseYaml(match[1]) as Record<string, unknown>;
}

function getMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => join(dir, entry));
}

function createResult(file: string): ValidationResult {
  return { file, errors: [], warnings: [] };
}

function addZodErrors(result: ValidationResult, issues: z.ZodIssue[]): void {
  for (const issue of issues) {
    result.errors.push(`  [${issue.path.join('.')}] ${issue.message}`);
  }
}

function resolvePublicPath(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return join(PUBLIC_DIR, path.slice(1));
  return join(ROOT, path);
}

function assertPathExists(result: ValidationResult, field: string, path: string): void {
  if (/^https?:\/\//.test(path)) return;
  const diskPath = resolvePublicPath(path);
  if (!existsSync(diskPath)) {
    result.errors.push(`  [${field}] Missing file on disk: ${path} (expected at ${diskPath})`);
  }
}

function assertSeoCompleteness(
  result: ValidationResult,
  fieldPrefix: string,
  seo: z.infer<typeof seoSchema> | undefined,
): void {
  if (!seo) {
    result.errors.push(`  [${fieldPrefix}] SEO object is required for this content type.`);
    return;
  }

  const titleDe = seo.title.de.trim();
  const titleEn = seo.title.en.trim();
  const descriptionDe = seo.description.de.trim();
  const descriptionEn = seo.description.en.trim();

  if (!titleDe || !titleEn) {
    result.errors.push(`  [${fieldPrefix}.title] SEO title must be filled in DE and EN.`);
  }
  if (!descriptionDe || !descriptionEn) {
    result.errors.push(`  [${fieldPrefix}.description] SEO description must be filled in DE and EN.`);
  }
  if (!seo.keywords || seo.keywords.length === 0) {
    result.warnings.push(`  [${fieldPrefix}.keywords] Add keyword targets to support SEO planning.`);
  }
}

function normalizePublicAssetPath(path: string): string | null {
  if (/^https?:\/\//.test(path)) return null;

  const normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return normalized;
  if (normalized.startsWith('public/')) return `/${normalized.slice('public/'.length)}`;
  return `/${normalized.replace(/^\.?\//, '')}`;
}

function getFilesRecursively(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractDataCmsPaths(filePath: string): string[] {
  if (!existsSync(filePath)) return [];
  const source = readFileSync(filePath, 'utf-8');
  const matches = source.matchAll(/data-cms-path="([^"]+)"/g);
  return Array.from(matches, (match) => match[1]);
}

function validatePreviewContracts(): ValidationResult {
  const result = createResult('cms-preview-contracts');

  if (!existsSync(CMS_PREVIEW_HOME_ROUTE)) {
    result.errors.push(`  [preview.routes] Missing ${relative(ROOT, CMS_PREVIEW_HOME_ROUTE)}`);
  }
  if (!existsSync(CMS_PREVIEW_APARTMENT_ROUTE)) {
    result.errors.push(`  [preview.routes] Missing ${relative(ROOT, CMS_PREVIEW_APARTMENT_ROUTE)}`);
  }
  if (!existsSync(CMS_PREVIEW_CONTENT_PAGE_ROUTE)) {
    result.errors.push(`  [preview.routes] Missing ${relative(ROOT, CMS_PREVIEW_CONTENT_PAGE_ROUTE)}`);
  }
  if (!existsSync(CMS_PREVIEW_GUIDE_ROUTE)) {
    result.errors.push(`  [preview.routes] Missing ${relative(ROOT, CMS_PREVIEW_GUIDE_ROUTE)}`);
  }
  if (!existsSync(CMS_PREVIEW_FRAME_PATH)) {
    result.errors.push(`  [preview.frame] Missing ${relative(ROOT, CMS_PREVIEW_FRAME_PATH)}`);
    return result;
  }

  const homePaths = extractDataCmsPaths(CMS_PREVIEW_HOME_ROUTE);
  const apartmentPaths = extractDataCmsPaths(CMS_PREVIEW_APARTMENT_ROUTE);
  const contentPagePaths = extractDataCmsPaths(CMS_PREVIEW_CONTENT_PAGE_ROUTE);
  const guidePaths = extractDataCmsPaths(CMS_PREVIEW_GUIDE_ROUTE);

  const homePathSet = new Set(homePaths);
  const apartmentPathSet = new Set(apartmentPaths);
  const contentPagePathSet = new Set(contentPagePaths);
  const guidePathSet = new Set(guidePaths);

  HOME_REQUIRED_PREVIEW_PATHS.forEach((path) => {
    if (!homePathSet.has(path)) {
      result.errors.push(`  [preview.home] Missing data-cms-path="${path}"`);
    }
  });

  APARTMENT_REQUIRED_PREVIEW_PATHS.forEach((path) => {
    if (!apartmentPathSet.has(path)) {
      result.errors.push(`  [preview.apartment] Missing data-cms-path="${path}"`);
    }
  });

  CONTENT_PAGE_REQUIRED_PREVIEW_PATHS.forEach((path) => {
    if (!contentPagePathSet.has(path)) {
      result.errors.push(`  [preview.content-page] Missing data-cms-path="${path}"`);
    }
  });

  GUIDE_REQUIRED_PREVIEW_PATHS.forEach((path) => {
    if (!guidePathSet.has(path)) {
      result.errors.push(`  [preview.guide] Missing data-cms-path="${path}"`);
    }
  });

  const duplicateHomePaths = homePaths.filter((path, index) => homePaths.indexOf(path) !== index);
  duplicateHomePaths.forEach((path) => {
    result.errors.push(`  [preview.home] Duplicate data-cms-path="${path}"`);
  });

  const duplicateApartmentPaths = apartmentPaths.filter((path, index) => apartmentPaths.indexOf(path) !== index);
  duplicateApartmentPaths.forEach((path) => {
    result.errors.push(`  [preview.apartment] Duplicate data-cms-path="${path}"`);
  });

  const duplicateContentPagePaths = contentPagePaths.filter((path, index) => contentPagePaths.indexOf(path) !== index);
  duplicateContentPagePaths.forEach((path) => {
    result.errors.push(`  [preview.content-page] Duplicate data-cms-path="${path}"`);
  });

  const duplicateGuidePaths = guidePaths.filter((path, index) => guidePaths.indexOf(path) !== index);
  duplicateGuidePaths.forEach((path) => {
    result.errors.push(`  [preview.guide] Duplicate data-cms-path="${path}"`);
  });

  const frameSource = readFileSync(CMS_PREVIEW_FRAME_PATH, 'utf-8');
  if (!frameSource.includes(RICH_TEXT_CONFIG_SIGNATURE)) {
    result.errors.push(`  [preview.frame.richtext] Signature mismatch. Expected "${RICH_TEXT_CONFIG_SIGNATURE}".`);
  }

  if (!frameSource.includes('CMS_PREVIEW_UPDATE') || !frameSource.includes('CMS_PREVIEW_READY')) {
    result.errors.push('  [preview.frame.protocol] Missing required preview protocol message handlers.');
  }

  if (existsSync(DECAP_ADMIN_INDEX_PATH)) {
    const adminIndex = readFileSync(DECAP_ADMIN_INDEX_PATH, 'utf-8');
    if (!adminIndex.includes('/admin/preview.js')) {
      result.errors.push('  [admin.index] Expected /admin/preview.js to be loaded before CMS.init().');
    }

     const decapPos = adminIndex.indexOf('decap-cms@3.10.1/dist/decap-cms.js');
     const mediaBackendPos = adminIndex.indexOf('/admin/media-backend.js');
     const previewPos = adminIndex.indexOf('/admin/preview.js');
     const initPos = adminIndex.indexOf('window.CMS.init()');
     if (!(decapPos < mediaBackendPos && mediaBackendPos < previewPos && previewPos < initPos)) {
       result.errors.push('  [admin.index] Expected load order: decap-cms -> media-backend.js -> preview.js -> CMS.init().');
     }
  } else {
    result.errors.push('  [admin.index] Missing public/admin/index.html');
  }

  return result;
}

function validateDecapConfig(): ValidationResult {
  const result = createResult(DECAP_CONFIG_PATH);

  const data = parseYaml(readFileSync(DECAP_CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  const backend = typeof data.backend === 'object' && data.backend
    ? data.backend as Record<string, unknown>
    : null;

  if (!backend || backend.name !== 'git-gateway-recursive') {
    result.errors.push('  [backend.name] Expected "git-gateway-recursive".');
  }

  const publishMode = data.publish_mode;
  if (publishMode !== 'editorial_workflow') {
    result.errors.push('  [publish_mode] Expected "editorial_workflow".');
  }

  const editor = typeof data.editor === 'object' && data.editor
    ? data.editor as Record<string, unknown>
    : null;
  if (!editor || editor.preview !== true) {
    result.errors.push('  [editor.preview] Expected true for visual preview.');
  }

  if (data.media_folder !== 'public/images') {
    result.errors.push('  [media_folder] Expected "public/images".');
  }

  if (data.public_folder !== '/images') {
    result.errors.push('  [public_folder] Expected "/images".');
  }

  const collections = Array.isArray(data.collections) ? data.collections as Array<Record<string, unknown>> : [];
  const apartmentsCollection = collections.find((collection) => collection.name === 'apartments');
  if (apartmentsCollection?.media_folder !== 'public/images/apartments/{{slug}}') {
    result.errors.push('  [collections.apartments.media_folder] Expected "public/images/apartments/{{slug}}".');
  }
  if (apartmentsCollection?.public_folder !== '/images/apartments/{{slug}}') {
    result.errors.push('  [collections.apartments.public_folder] Expected "/images/apartments/{{slug}}".');
  }
  const apartmentFields = Array.isArray(apartmentsCollection?.fields)
    ? apartmentsCollection.fields as Array<Record<string, unknown>>
    : [];
  const availableFromField = apartmentFields.find((field) => field.name === 'availableFrom');
  if (availableFromField?.widget !== 'datetime') {
    result.errors.push('  [collections.apartments.availableFrom.widget] Expected "datetime" (date-only mode via time_format: false).');
  }
  const imagesField = apartmentFields.find((field) => field.name === 'images');
  const imageSubFields = Array.isArray(imagesField?.fields) ? imagesField.fields as Array<Record<string, unknown>> : [];
  const imageSubFieldNames = imageSubFields
    .map((field) => field.name)
    .filter((name): name is string => typeof name === 'string');
  const requiredImageSubFields = ['image', 'kind', 'caption', 'isPrimary'];
  const hasStructuredImageFields = requiredImageSubFields.every((requiredField) => imageSubFieldNames.includes(requiredField));
  if (!hasStructuredImageFields) {
    result.errors.push('  [collections.apartments.images] Expected structured image fields: image, kind, caption, isPrimary.');
  }

  const kindField = imageSubFields.find((field) => field.name === 'kind');
  const kindOptions = Array.isArray(kindField?.options) ? kindField.options as Array<Record<string, unknown>> : [];
  const kindOptionValues = kindOptions
    .map((option) => option.value)
    .filter((value): value is string => typeof value === 'string');
  const expectedKindOptions = [...APARTMENT_IMAGE_KIND_OPTIONS];
  const sameKindLength = kindOptionValues.length === expectedKindOptions.length;
  const sameKindValues = sameKindLength && kindOptionValues.every((value, index) => value === expectedKindOptions[index]);
  if (!sameKindValues) {
    result.errors.push(`  [collections.apartments.images.kind.options] Expected image kind options: ${expectedKindOptions.join(', ')}`);
  }

  const pagesCollection = collections.find((collection) => collection.name === 'pages');
  if (pagesCollection?.media_folder !== 'public/images/pages') {
    result.errors.push('  [collections.pages.media_folder] Expected "public/images/pages".');
  }
  if (pagesCollection?.public_folder !== '/images/pages') {
    result.errors.push('  [collections.pages.public_folder] Expected "/images/pages".');
  }

  const files = Array.isArray(pagesCollection?.files) ? pagesCollection?.files as Array<Record<string, unknown>> : [];
  const homeFile = files.find((entry) => entry.name === 'home');

  if (homeFile?.media_folder !== 'public/images/hero') {
    result.errors.push('  [collections.pages.files.home.media_folder] Expected "public/images/hero".');
  }
  if (homeFile?.public_folder !== '/images/hero') {
    result.errors.push('  [collections.pages.files.home.public_folder] Expected "/images/hero".');
  }
  if (homeFile?.preview_path !== 'de/') {
    result.errors.push('  [collections.pages.files.home.preview_path] Expected "de/".');
  }

  const homeFields = Array.isArray(homeFile?.fields) ? homeFile?.fields as Array<Record<string, unknown>> : [];
  const heroField = homeFields.find((field) => field.name === 'hero');
  const heroFields = Array.isArray(heroField?.fields) ? heroField?.fields as Array<Record<string, unknown>> : [];
  const heroImagesField = heroFields.find((field) => field.name === 'images');
  const heroImageChildren = Array.isArray(heroImagesField?.fields) ? heroImagesField?.fields as Array<Record<string, unknown>> : [];
  const heroImageNames = heroImageChildren
    .map((field) => field.name)
    .filter((name): name is string => typeof name === 'string');
  const expectedHeroImageNames = ['desktop', 'tablet', 'mobile'];

  const hasHeroImageFields = expectedHeroImageNames.every((expected) => heroImageNames.includes(expected));
  if (!hasHeroImageFields) {
    result.errors.push('  [collections.pages.home.hero.images] Expected desktop/tablet/mobile image fields.');
  }

  const welcomeSpotlightField = homeFields.find((field) => field.name === 'welcomeSpotlight');
  const welcomeSpotlightChildren = Array.isArray(welcomeSpotlightField?.fields)
    ? welcomeSpotlightField.fields as Array<Record<string, unknown>>
    : [];
  const welcomeSpotlightNames = welcomeSpotlightChildren
    .map((field) => field.name)
    .filter((name): name is string => typeof name === 'string');
  const expectedWelcomeSpotlightNames = ['eyebrow', 'headline', 'body', 'ctaLabel', 'ctaHref', 'image', 'imageAlt'];
  const hasWelcomeSpotlightFields = expectedWelcomeSpotlightNames.every((expected) => welcomeSpotlightNames.includes(expected));
  if (!hasWelcomeSpotlightFields) {
    result.errors.push('  [collections.pages.home.welcomeSpotlight] Expected fields: eyebrow, headline, body, ctaLabel, ctaHref, image, imageAlt.');
  }

  const featuresField = homeFields.find((field) => field.name === 'features');
  const featureFields = Array.isArray(featuresField?.fields) ? featuresField?.fields as Array<Record<string, unknown>> : [];
  const iconField = featureFields.find((field) => field.name === 'icon');
  const options = Array.isArray(iconField?.options) ? iconField?.options as Array<Record<string, unknown>> : [];
  const optionValues = options
    .map((option) => option.value)
    .filter((value): value is string => typeof value === 'string');

  const expected = [...FEATURE_ICON_OPTIONS];
  const sameLength = optionValues.length === expected.length;
  const sameValues = sameLength && optionValues.every((value, index) => value === expected[index]);

  if (!sameValues) {
    result.errors.push(`  [collections.pages.home.features.icon.options] Expected icon options: ${expected.join(', ')}`);
  }

  const contentPagesCollection = collections.find((collection) => collection.name === 'content_pages');
  if (contentPagesCollection?.folder !== 'src/content/pages') {
    result.errors.push('  [collections.content_pages.folder] Expected "src/content/pages".');
  }
  if (contentPagesCollection?.create !== true) {
    result.errors.push('  [collections.content_pages.create] Expected true.');
  }
  if (contentPagesCollection?.media_folder !== 'public/images/pages/{{slug}}') {
    result.errors.push('  [collections.content_pages.media_folder] Expected "public/images/pages/{{slug}}".');
  }
  if (contentPagesCollection?.public_folder !== '/images/pages/{{slug}}') {
    result.errors.push('  [collections.content_pages.public_folder] Expected "/images/pages/{{slug}}".');
  }
  if (contentPagesCollection?.preview_path !== 'de/{{fields.routeSlug.de}}/') {
    result.errors.push('  [collections.content_pages.preview_path] Expected "de/{{fields.routeSlug.de}}/".');
  }
  const contentPagesFilter = typeof contentPagesCollection?.filter === 'object' && contentPagesCollection.filter
    ? contentPagesCollection.filter as Record<string, unknown>
    : null;
  if (!contentPagesFilter || contentPagesFilter.field !== 'kind' || contentPagesFilter.value !== 'content') {
    result.errors.push('  [collections.content_pages.filter] Expected filter field "kind" with value "content".');
  }

  const guidesCollection = collections.find((collection) => collection.name === 'guides');
  if (guidesCollection?.media_folder !== 'public/images/guides/{{slug}}') {
    result.errors.push('  [collections.guides.media_folder] Expected "public/images/guides/{{slug}}".');
  }
  if (guidesCollection?.public_folder !== '/images/guides/{{slug}}') {
    result.errors.push('  [collections.guides.public_folder] Expected "/images/guides/{{slug}}".');
  }
  if (guidesCollection?.preview_path !== 'de/guides/{{slug}}/') {
    result.errors.push('  [collections.guides.preview_path] Expected "de/guides/{{slug}}/".');
  }

  return result;
}

const results: ValidationResult[] = [];
let hasErrors = false;
const referencedMediaPaths = new Set<string>();

function collectResult(result: ValidationResult): void {
  if (result.errors.length > 0) hasErrors = true;
  results.push(result);
}

console.log('=== Content Collection Validation (CMS V2) ===\n');

collectResult(validateDecapConfig());
collectResult(validatePreviewContracts());

for (const file of getMdFiles(APARTMENTS_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const parsed = apartmentSchema.safeParse(data);
  const apartmentSlug = basename(file, '.md');

  if (!parsed.success) {
    addZodErrors(result, parsed.error.issues);
    collectResult(result);
    continue;
  }

  parsed.data.images.forEach((imageEntry, index) => {
    assertPathExists(result, `images[${index}].image`, imageEntry.image);
    const expectedPrefix = `/images/apartments/${apartmentSlug}/`;
    if (!imageEntry.image.startsWith(expectedPrefix)) {
      result.errors.push(`  [images[${index}].image] Expected path to start with ${expectedPrefix}`);
    }

    const normalizedImagePath = normalizePublicAssetPath(imageEntry.image);
    if (normalizedImagePath) referencedMediaPaths.add(normalizedImagePath);

    if (imageEntry.caption) {
      const hasCaptionDe = (imageEntry.caption.de ?? '').trim().length > 0;
      const hasCaptionEn = (imageEntry.caption.en ?? '').trim().length > 0;
      if (hasCaptionDe !== hasCaptionEn) {
        result.warnings.push(`  [images[${index}].caption] Provide DE and EN captions together, or leave both empty.`);
      }
    }
  });

  const primaryImageCount = parsed.data.images.filter((image) => image.isPrimary).length;
  if (primaryImageCount === 0) {
    result.warnings.push('  [images] No primary image selected; first image will be used as fallback.');
  } else if (primaryImageCount > 1) {
    result.errors.push('  [images] Multiple primary images selected; only one is allowed.');
  }

  assertSeoCompleteness(result, 'seo', parsed.data.seo);

  if (parsed.data.seo?.ogImage) {
    assertPathExists(result, 'seo.ogImage', parsed.data.seo.ogImage);
    const normalizedSeoPath = normalizePublicAssetPath(parsed.data.seo.ogImage);
    if (normalizedSeoPath) referencedMediaPaths.add(normalizedSeoPath);
  }

  collectResult(result);
}

const contentPageSlugsByLocale: Record<'de' | 'en', Map<string, string>> = {
  de: new Map(),
  en: new Map(),
};
let hasCanonicalFaqSlug = false;

for (const file of getMdFiles(PAGES_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const name = basename(file);

  if (name === 'home.md') {
    const parsed = homePageSchema.safeParse(data);
    if (!parsed.success) {
      addZodErrors(result, parsed.error.issues);
    } else {
      assertPathExists(result, 'hero.images.desktop', parsed.data.hero.images.desktop);
      assertPathExists(result, 'hero.images.tablet', parsed.data.hero.images.tablet);
      assertPathExists(result, 'hero.images.mobile', parsed.data.hero.images.mobile);
      const normalizedDesktop = normalizePublicAssetPath(parsed.data.hero.images.desktop);
      const normalizedTablet = normalizePublicAssetPath(parsed.data.hero.images.tablet);
      const normalizedMobile = normalizePublicAssetPath(parsed.data.hero.images.mobile);
      if (normalizedDesktop) referencedMediaPaths.add(normalizedDesktop);
      if (normalizedTablet) referencedMediaPaths.add(normalizedTablet);
      if (normalizedMobile) referencedMediaPaths.add(normalizedMobile);

      if (parsed.data.welcomeSpotlight?.image) {
        assertPathExists(result, 'welcomeSpotlight.image', parsed.data.welcomeSpotlight.image);
        const normalizedWelcomeImage = normalizePublicAssetPath(parsed.data.welcomeSpotlight.image);
        if (normalizedWelcomeImage) referencedMediaPaths.add(normalizedWelcomeImage);
      }

      assertSeoCompleteness(result, 'seo', parsed.data.seo);

      if (parsed.data.seo?.ogImage) {
        assertPathExists(result, 'seo.ogImage', parsed.data.seo.ogImage);
        const normalizedSeoPath = normalizePublicAssetPath(parsed.data.seo.ogImage);
        if (normalizedSeoPath) referencedMediaPaths.add(normalizedSeoPath);
      }

      parsed.data.editorialBlocks?.forEach((block, index) => {
        if (block.type === 'ctaRow') {
          if (!block.buttonHref.de.startsWith('/de/')) {
            result.warnings.push(`  [editorialBlocks[${index}].buttonHref.de] Expected DE links to start with /de/`);
          }
          if (!block.buttonHref.en.startsWith('/en/')) {
            result.warnings.push(`  [editorialBlocks[${index}].buttonHref.en] Expected EN links to start with /en/`);
          }
        }
      });
    }
  } else {
    const baseParsed = contentPageBaseSchema.safeParse(data);
    if (!baseParsed.success) {
      addZodErrors(result, baseParsed.error.issues);
      collectResult(result);
      continue;
    }

    const pageData = baseParsed.data;
    (['de', 'en'] as const).forEach((locale) => {
      const slug = pageData.routeSlug[locale].trim().toLowerCase();
      if (slug.includes('/')) {
        result.errors.push(`  [routeSlug.${locale}] Slug must be a single segment without "/".`);
      }

      const existing = contentPageSlugsByLocale[locale].get(slug);
      if (existing && existing !== name) {
        result.errors.push(`  [routeSlug.${locale}] Duplicate slug "${slug}" also used in ${existing}.`);
      } else {
        contentPageSlugsByLocale[locale].set(slug, name);
      }
    });

    if (pageData.pageType === 'faq') {
      const parsed = faqContentPageSchema.safeParse(pageData);
      if (!parsed.success) {
        addZodErrors(result, parsed.error.issues);
      } else {
        const isCanonicalFaq = parsed.data.routeSlug.de.trim().toLowerCase() === 'faq'
          && parsed.data.routeSlug.en.trim().toLowerCase() === 'faq';
        if (isCanonicalFaq) hasCanonicalFaqSlug = true;
      }
    } else if (pageData.pageType === 'exchange') {
      const parsed = exchangeContentPageSchema.safeParse(pageData);
      if (!parsed.success) addZodErrors(result, parsed.error.issues);
    } else if (pageData.pageType === 'standard') {
      const parsed = standardContentPageSchema.safeParse(pageData);
      if (!parsed.success) addZodErrors(result, parsed.error.issues);
    }

    if (pageData.seo?.ogImage) {
      assertPathExists(result, 'seo.ogImage', pageData.seo.ogImage);
      const normalizedSeoPath = normalizePublicAssetPath(pageData.seo.ogImage);
      if (normalizedSeoPath) referencedMediaPaths.add(normalizedSeoPath);
    }
  }

  collectResult(result);
}

const contentPagesConsistencyResult = createResult('content-pages-consistency');
if (!hasCanonicalFaqSlug) {
  contentPagesConsistencyResult.errors.push('  [faq] Missing canonical FAQ page with routeSlug.de=faq and routeSlug.en=faq. Homepage FAQ section relies on this single data source.');
}
collectResult(contentPagesConsistencyResult);

for (const file of getMdFiles(GUIDES_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const parsed = guideSchema.safeParse(data);
  const guideSlug = basename(file, '.md');

  if (!parsed.success) {
    addZodErrors(result, parsed.error.issues);
    collectResult(result);
    continue;
  }

  if (parsed.data.heroImage) {
    assertPathExists(result, 'heroImage', parsed.data.heroImage);
    const normalizedHeroImage = normalizePublicAssetPath(parsed.data.heroImage);
    if (normalizedHeroImage) referencedMediaPaths.add(normalizedHeroImage);

    const expectedPrefix = `/images/guides/${guideSlug}/`;
    if (!parsed.data.heroImage.startsWith(expectedPrefix)) {
      result.warnings.push(`  [heroImage] Recommended path prefix is ${expectedPrefix}`);
    }
  }

  assertSeoCompleteness(result, 'seo', parsed.data.seo);

  if (parsed.data.seo?.ogImage) {
    assertPathExists(result, 'seo.ogImage', parsed.data.seo.ogImage);
    const normalizedSeoImage = normalizePublicAssetPath(parsed.data.seo.ogImage);
    if (normalizedSeoImage) referencedMediaPaths.add(normalizedSeoImage);

    const expectedPrefix = `/images/guides/${guideSlug}/`;
    if (!parsed.data.seo.ogImage.startsWith(expectedPrefix)) {
      result.warnings.push(`  [seo.ogImage] Recommended path prefix is ${expectedPrefix}`);
    }
  }

  collectResult(result);
}

for (const file of getMdFiles(SETTINGS_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const parsed = settingsSchema.safeParse(data);
  if (!parsed.success) addZodErrors(result, parsed.error.issues);
  collectResult(result);
}

const orphanScanResult = createResult('public/images (orphan scan)');
const managedMediaRoots = [APARTMENTS_MEDIA_DIR, HERO_MEDIA_DIR, PAGES_MEDIA_DIR, GUIDES_MEDIA_DIR];

for (const mediaRoot of managedMediaRoots) {
  for (const absolutePath of getFilesRecursively(mediaRoot)) {
    const publicPath = `/${relative(PUBLIC_DIR, absolutePath).split(sep).join('/')}`;
    if (!referencedMediaPaths.has(publicPath)) {
      orphanScanResult.warnings.push(`  [orphan] Unreferenced media file: ${publicPath}`);
    }
  }
}
collectResult(orphanScanResult);

for (const result of results) {
  const status = result.errors.length === 0 ? '✓ PASS' : '✗ FAIL';
  const shortPath = result.file.startsWith(`${ROOT}/`)
    ? result.file.replace(`${ROOT}/`, '')
    : result.file;
  console.log(`${status}  ${shortPath}`);
  for (const error of result.errors) console.log(error);
  for (const warning of result.warnings) console.log(`  ⚠ ${warning}`);
}

console.log('\n=== Summary ===');
console.log(`Files validated: ${results.length}`);
console.log(`Errors: ${results.reduce((count, result) => count + result.errors.length, 0)}`);
console.log(`Warnings: ${results.reduce((count, result) => count + result.warnings.length, 0)}`);

if (hasErrors) {
  console.log('\n❌ Validation FAILED\n');
  process.exit(1);
}

console.log('\n✅ Validation PASSED\n');
