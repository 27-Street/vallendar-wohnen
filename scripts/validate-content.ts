import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { FEATURE_ICON_OPTIONS } from '../src/content/cms-shared';

const ROOT = resolve(import.meta.dirname, '..');
const APARTMENTS_DIR = join(ROOT, 'src/content/apartments');
const PAGES_DIR = join(ROOT, 'src/content/pages');
const SETTINGS_DIR = join(ROOT, 'src/content/settings');
const DECAP_CONFIG_PATH = join(ROOT, 'public/admin/config.yml');

const nonEmptyString = z.string().refine((value) => value.trim().length > 0, 'Must not be empty');

const bilingualString = z.object({
  de: nonEmptyString,
  en: nonEmptyString,
}).strict();

const seoSchema = z.object({
  title: bilingualString,
  description: bilingualString,
  ogImage: nonEmptyString.optional(),
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
  images: z.array(nonEmptyString).min(1),
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

const homePageSchema = z.object({
  title: z.literal('home'),
  hero: z.object({
    headline: bilingualString,
    subheadline: bilingualString,
    cta: bilingualString,
  }).strict(),
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

const faqPageSchema = z.object({
  title: z.literal('faq'),
  faq: z.array(
    z.object({
      question: bilingualString,
      answer: bilingualString,
    }).strict(),
  ).min(1),
}).strict();

const exchangeStudentsPageSchema = z.object({
  title: z.literal('exchange-students'),
  heading: bilingualString,
  subheading: bilingualString,
  intro: bilingualString,
  highlights: z.array(
    z.object({
      icon: nonEmptyString,
      title: bilingualString,
      description: bilingualString,
    }).strict(),
  ).min(1),
  whatsIncluded: bilingualString,
  aboutVallendar: bilingualString,
  remoteBooking: bilingualString,
  ctaText: bilingualString,
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
  if (path.startsWith('/')) return join(ROOT, 'public', path.slice(1));
  return join(ROOT, path);
}

function assertPathExists(result: ValidationResult, field: string, path: string): void {
  if (/^https?:\/\//.test(path)) return;
  const diskPath = resolvePublicPath(path);
  if (!existsSync(diskPath)) {
    result.errors.push(`  [${field}] Missing file on disk: ${path} (expected at ${diskPath})`);
  }
}

function validateDecapConfig(): ValidationResult {
  const result = createResult(DECAP_CONFIG_PATH);

  const data = parseYaml(readFileSync(DECAP_CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
  const publishMode = data.publish_mode;
  if (publishMode !== 'editorial_workflow') {
    result.errors.push('  [publish_mode] Expected "editorial_workflow".');
  }

  if (data.media_folder !== 'public/images/uploads') {
    result.errors.push('  [media_folder] Expected "public/images/uploads".');
  }

  if (data.public_folder !== '/images/uploads') {
    result.errors.push('  [public_folder] Expected "/images/uploads".');
  }

  const collections = Array.isArray(data.collections) ? data.collections as Array<Record<string, unknown>> : [];
  const pagesCollection = collections.find((collection) => collection.name === 'pages');
  const files = Array.isArray(pagesCollection?.files) ? pagesCollection?.files as Array<Record<string, unknown>> : [];
  const homeFile = files.find((entry) => entry.name === 'home');
  const homeFields = Array.isArray(homeFile?.fields) ? homeFile?.fields as Array<Record<string, unknown>> : [];
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

  return result;
}

const results: ValidationResult[] = [];
let hasErrors = false;

function collectResult(result: ValidationResult): void {
  if (result.errors.length > 0) hasErrors = true;
  results.push(result);
}

console.log('=== Content Collection Validation (CMS V2) ===\n');

collectResult(validateDecapConfig());

for (const file of getMdFiles(APARTMENTS_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const parsed = apartmentSchema.safeParse(data);

  if (!parsed.success) {
    addZodErrors(result, parsed.error.issues);
    collectResult(result);
    continue;
  }

  parsed.data.images.forEach((image, index) => assertPathExists(result, `images[${index}]`, image));

  if (parsed.data.seo?.ogImage) {
    assertPathExists(result, 'seo.ogImage', parsed.data.seo.ogImage);
  }

  collectResult(result);
}

for (const file of getMdFiles(PAGES_DIR)) {
  const result = createResult(file);
  const data = extractFrontmatter(file);
  const name = basename(file);

  if (name === 'home.md') {
    const parsed = homePageSchema.safeParse(data);
    if (!parsed.success) {
      addZodErrors(result, parsed.error.issues);
    } else {
      if (parsed.data.seo?.ogImage) {
        assertPathExists(result, 'seo.ogImage', parsed.data.seo.ogImage);
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
  } else if (name === 'faq.md') {
    const parsed = faqPageSchema.safeParse(data);
    if (!parsed.success) addZodErrors(result, parsed.error.issues);
  } else if (name === 'exchange-students.md') {
    const parsed = exchangeStudentsPageSchema.safeParse(data);
    if (!parsed.success) addZodErrors(result, parsed.error.issues);
  } else {
    result.errors.push('  [file] Unsupported page file for strict validation.');
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

for (const result of results) {
  const status = result.errors.length === 0 ? '✓ PASS' : '✗ FAIL';
  const shortPath = result.file.replace(`${ROOT}/`, '');
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
