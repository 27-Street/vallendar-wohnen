import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');
const APARTMENTS_DIR = join(ROOT, 'src/content/apartments');
const HOME_FILE = join(ROOT, 'src/content/pages/home.md');

type Bilingual = { de: string; en: string };

function extractFrontmatter(filePath: string): { data: Record<string, unknown>; body: string } {
  const raw = readFileSync(filePath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`No YAML frontmatter found in ${filePath}`);
  return {
    data: parseYaml(match[1]) as Record<string, unknown>,
    body: match[2] ?? '',
  };
}

function writeFrontmatter(filePath: string, data: Record<string, unknown>, body: string): void {
  const yaml = stringifyYaml(data, { lineWidth: 0 }).trimEnd();
  const suffix = body.trim().length > 0 ? `${body.trimStart()}` : '';
  writeFileSync(filePath, `---\n${yaml}\n---\n${suffix}`, 'utf-8');
}

function toEnglishRoomLabel(value: string): string {
  return value
    .replace('Zimmer', 'rooms')
    .replace('zimmer', 'rooms')
    .replace(',', '.')
    .trim();
}

function toEnglishFloorLabel(value: string): string {
  if (value === 'EG') return 'Ground floor';
  if (value.endsWith('. OG')) {
    const floorNumber = value.replace('. OG', '').trim();
    if (floorNumber === '1') return '1st floor';
    if (floorNumber === '2') return '2nd floor';
    if (floorNumber === '3') return '3rd floor';
    return `${floorNumber}th floor`;
  }
  return value;
}

const AMENITY_TRANSLATIONS: Record<string, string> = {
  WLAN: 'Wi-Fi',
  Einbauküche: 'Fitted kitchen',
  Waschmaschine: 'Washing machine',
  Schreibtisch: 'Desk',
  Kleiderschrank: 'Wardrobe',
  Balkon: 'Balcony',
  Terrasse: 'Terrace',
  Fahrradstellplatz: 'Bicycle parking',
};

function toBilingualString(value: unknown): Bilingual {
  if (typeof value === 'object' && value && 'de' in (value as Record<string, unknown>) && 'en' in (value as Record<string, unknown>)) {
    return value as Bilingual;
  }
  if (typeof value === 'string') return { de: value, en: value };
  return { de: '', en: '' };
}

function migrateApartments(): string[] {
  const changed: string[] = [];
  const files = readdirSync(APARTMENTS_DIR).filter((file) => file.endsWith('.md'));

  for (const file of files) {
    const filePath = join(APARTMENTS_DIR, file);
    const { data, body } = extractFrontmatter(filePath);
    const slug = basename(file, '.md');

    if (typeof data.rooms === 'string') {
      data.rooms = { de: data.rooms, en: toEnglishRoomLabel(data.rooms) };
    } else {
      data.rooms = toBilingualString(data.rooms);
    }

    if (typeof data.floor === 'string') {
      data.floor = { de: data.floor, en: toEnglishFloorLabel(data.floor) };
    } else {
      data.floor = toBilingualString(data.floor);
    }

    if (Array.isArray(data.amenities)) {
      data.amenities = data.amenities.map((amenity) => {
        if (typeof amenity === 'string') {
          return {
            de: amenity,
            en: AMENITY_TRANSLATIONS[amenity] ?? amenity,
          };
        }
        return toBilingualString(amenity);
      });
    } else {
      data.amenities = [];
    }

    if (typeof data.description !== 'object' || !data.description) {
      data.description = toBilingualString(data.description);
    }

    if (typeof data.seo !== 'object' || !data.seo) {
      const name = String(data.name ?? slug);
      const size = Number(data.size ?? 0);
      data.seo = {
        title: {
          de: `${name} - ${size} m² Studentenwohnung in Vallendar`,
          en: `${name} - ${size} m² Student Apartment in Vallendar`,
        },
        description: {
          de: `${name} in Vallendar, möbliert und in WHU-Nähe.`,
          en: `${name} in Vallendar, furnished and close to WHU.`,
        },
        ogImage: `/images/apartments/${slug}/og.png`,
      };
    }

    writeFrontmatter(filePath, data, body);
    changed.push(filePath);
  }

  return changed;
}

function migrateHomePage(): string[] {
  const changed: string[] = [];
  const { data, body } = extractFrontmatter(HOME_FILE);

  if (typeof data.sectionSubheadline !== 'object' || !data.sectionSubheadline) {
    data.sectionSubheadline = toBilingualString(data.sectionSubheadline);
  }

  if (!Array.isArray(data.editorialBlocks)) {
    data.editorialBlocks = [
      {
        type: 'richText',
        body: {
          de: '### Für Studierende gedacht\n\nUnsere Wohnungen sind auf den Studienalltag zugeschnitten.',
          en: '### Built for student life\n\nOur apartments are designed around daily student needs.',
        },
      },
      {
        type: 'callout',
        tone: 'info',
        title: {
          de: 'Transparente Kosten',
          en: 'Transparent costs',
        },
        body: {
          de: 'Kaltmiete und Nebenkosten sind klar ausgewiesen.',
          en: 'Base rent and utilities are clearly listed.',
        },
      },
      {
        type: 'ctaRow',
        text: {
          de: 'Haben Sie Fragen zur Verfügbarkeit?',
          en: 'Questions about availability?',
        },
        buttonLabel: {
          de: 'Kontakt aufnehmen',
          en: 'Contact us',
        },
        buttonHref: {
          de: '/de/kontakt',
          en: '/en/contact',
        },
      },
    ];
  }

  if (typeof data.seo !== 'object' || !data.seo) {
    data.seo = {
      title: {
        de: 'Möblierte Studentenwohnungen in Vallendar | VallendarWohnen',
        en: 'Furnished Student Apartments in Vallendar | VallendarWohnen',
      },
      description: {
        de: 'Möblierte Apartments für Studierende in Vallendar, direkt gegenüber der WHU.',
        en: 'Furnished apartments for students in Vallendar, right across from WHU.',
      },
      ogImage: '/og-default.png',
    };
  }

  writeFrontmatter(HOME_FILE, data, body);
  changed.push(HOME_FILE);
  return changed;
}

const apartmentChanges = migrateApartments();
const homeChanges = migrateHomePage();

console.log('CMS V2 migration completed.');
console.log(`Apartments migrated: ${apartmentChanges.length}`);
console.log(`Home page migrated: ${homeChanges.length}`);
