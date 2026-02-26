import { z } from 'zod';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');

// ── Schemas (mirrored from src/content/config.ts) ──────────────────────────

const bilingualString = z.object({
  de: z.string().min(1, 'German translation must not be empty'),
  en: z.string().min(1, 'English translation must not be empty'),
});

const apartmentSchema = z.object({
  name: z.string().min(1),
  tagline: bilingualString,
  description: bilingualString,
  size: z.number().positive(),
  rooms: z.string().min(1),
  maxOccupants: z.number().int().positive(),
  pricePerMonth: z.number().positive(),
  utilitiesPerMonth: z.number().positive(),
  amenities: z.array(z.string().min(1)).min(1),
  available: z.boolean(),
  availableFrom: z.string().optional(),
  images: z.array(z.string().min(1)).min(1),
  floor: z.string().min(1),
  order: z.number().int().positive(),
});

const pageSchema = z.object({
  title: z.string().min(1),
  hero: z.object({
    headline: bilingualString,
    subheadline: bilingualString,
    cta: bilingualString,
  }).optional(),
  sectionSubheadline: bilingualString.optional(),
  features: z.array(z.object({
    icon: z.string().min(1),
    label: bilingualString,
  })).optional(),
});

const settingsSchema = z.object({
  propertyName: z.string().min(1),
  propertyNameAccent: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
  }),
  email: z.string().email(),
  phone: z.string().min(1),
  phoneDisplay: z.string().min(1),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

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
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];
let hasErrors = false;

function validate(
  file: string,
  schema: z.ZodType,
  data: Record<string, unknown>,
): ValidationResult {
  const result: ValidationResult = { file, errors: [], warnings: [] };
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      result.errors.push(`  [${issue.path.join('.')}] ${issue.message}`);
    }
  }
  return result;
}

function checkImagePaths(
  data: Record<string, unknown>,
  file: string,
): string[] {
  const warnings: string[] = [];
  const images = data.images as string[] | undefined;
  if (!images) return warnings;

  for (const img of images) {
    // Images in frontmatter use /images/... which maps to public/images/...
    const onDisk = join(ROOT, 'public', img);
    if (!existsSync(onDisk)) {
      warnings.push(`  Image not found on disk: ${img} (expected at ${onDisk})`);
    }
  }
  return warnings;
}

// ── Validate Apartments ─────────────────────────────────────────────────────

console.log('=== Content Collection Validation ===\n');

const apartmentDir = join(ROOT, 'src/content/apartments');
const apartmentFiles = getMdFiles(apartmentDir);

if (apartmentFiles.length === 0) {
  console.log('WARNING: No apartment files found!\n');
}

for (const file of apartmentFiles) {
  const data = extractFrontmatter(file);
  const result = validate(file, apartmentSchema, data);

  // Check bilingual fields are non-empty
  for (const field of ['tagline', 'description'] as const) {
    const obj = data[field] as { de?: string; en?: string } | undefined;
    if (obj) {
      if (!obj.de?.trim()) result.errors.push(`  [${field}.de] Missing German translation`);
      if (!obj.en?.trim()) result.errors.push(`  [${field}.en] Missing English translation`);
    }
  }

  // Check image paths exist on disk
  result.warnings.push(...checkImagePaths(data, file));

  if (result.errors.length > 0) hasErrors = true;
  results.push(result);
}

// ── Validate Pages ──────────────────────────────────────────────────────────

const pagesDir = join(ROOT, 'src/content/pages');
const pageFiles = getMdFiles(pagesDir);

for (const file of pageFiles) {
  const data = extractFrontmatter(file);
  const result = validate(file, pageSchema, data);

  // Check bilingual fields in hero
  const hero = data.hero as { headline?: { de?: string; en?: string }; subheadline?: { de?: string; en?: string }; cta?: { de?: string; en?: string } } | undefined;
  if (hero) {
    for (const sub of ['headline', 'subheadline', 'cta'] as const) {
      const obj = hero[sub];
      if (obj) {
        if (!obj.de?.trim()) result.errors.push(`  [hero.${sub}.de] Missing German translation`);
        if (!obj.en?.trim()) result.errors.push(`  [hero.${sub}.en] Missing English translation`);
      }
    }
  }

  // Check bilingual fields in features
  const features = data.features as Array<{ label?: { de?: string; en?: string } }> | undefined;
  if (features) {
    features.forEach((feat, i) => {
      if (!feat.label?.de?.trim()) result.errors.push(`  [features[${i}].label.de] Missing German translation`);
      if (!feat.label?.en?.trim()) result.errors.push(`  [features[${i}].label.en] Missing English translation`);
    });
  }

  if (result.errors.length > 0) hasErrors = true;
  results.push(result);
}

// ── Validate Settings ───────────────────────────────────────────────────────

const settingsDir = join(ROOT, 'src/content/settings');
const settingsFiles = getMdFiles(settingsDir);

if (settingsFiles.length === 0) {
  console.log('WARNING: No settings files found!\n');
}

for (const file of settingsFiles) {
  const data = extractFrontmatter(file);
  const result = validate(file, settingsSchema, data);
  if (result.errors.length > 0) hasErrors = true;
  results.push(result);
}

// ── Report ──────────────────────────────────────────────────────────────────

for (const r of results) {
  const status = r.errors.length === 0 ? '✓ PASS' : '✗ FAIL';
  const shortPath = r.file.replace(ROOT + '/', '');
  console.log(`${status}  ${shortPath}`);
  for (const err of r.errors) console.log(err);
  for (const warn of r.warnings) console.log(`  ⚠ ${warn}`);
}

console.log(`\n=== Summary ===`);
console.log(`Files validated: ${results.length}`);
console.log(`Errors: ${results.reduce((n, r) => n + r.errors.length, 0)}`);
console.log(`Warnings: ${results.reduce((n, r) => n + r.warnings.length, 0)}`);

if (hasErrors) {
  console.log('\n❌ Validation FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ Validation PASSED\n');
}
