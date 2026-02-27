import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { FEATURE_ICON_OPTIONS } from './cms-shared';

const bilingualString = z.object({
  de: z.string(),
  en: z.string(),
});

const LEGACY_AMENITY_TRANSLATIONS: Record<string, string> = {
  WLAN: 'Wi-Fi',
  Einbauküche: 'Fitted kitchen',
  Waschmaschine: 'Washing machine',
  Schreibtisch: 'Desk',
  Kleiderschrank: 'Wardrobe',
  Balkon: 'Balcony',
  Terrasse: 'Terrace',
  Fahrradstellplatz: 'Bicycle parking',
};

const seoSchema = z.object({
  title: bilingualString,
  description: bilingualString,
  ogImage: z.string().optional(),
});

const availableFromSchema = z.union([z.string(), z.date()]).transform((value) => (
  typeof value === 'string'
    ? value
    : value.toISOString().slice(0, 10)
));

const roomsSchema = z.union([bilingualString, z.string()]).transform((value) => (
  typeof value === 'string'
    ? {
      de: value,
      en: value.replace('Zimmer', 'rooms').replace('zimmer', 'rooms').replace(',', '.').trim(),
    }
    : value
));

const floorSchema = z.union([bilingualString, z.string()]).transform((value) => {
  if (typeof value !== 'string') return value;
  if (value === 'EG') return { de: value, en: 'Ground floor' };

  if (value.endsWith('. OG')) {
    const floorNumber = value.replace('. OG', '').trim();
    if (floorNumber === '1') return { de: value, en: '1st floor' };
    if (floorNumber === '2') return { de: value, en: '2nd floor' };
    if (floorNumber === '3') return { de: value, en: '3rd floor' };
    return { de: value, en: `${floorNumber}th floor` };
  }

  return { de: value, en: value };
});

const amenitiesSchema = z.union([z.array(bilingualString), z.array(z.string())]).transform((values) => values.map((value) => {
  if (typeof value === 'string') {
    return {
      de: value,
      en: LEGACY_AMENITY_TRANSLATIONS[value] ?? value,
    };
  }
  return value;
}));

const apartments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/apartments' }),
  schema: z.object({
    name: z.string(),
    tagline: bilingualString,
    description: bilingualString,
    size: z.number(),
    rooms: roomsSchema,
    maxOccupants: z.number(),
    pricePerMonth: z.number(),
    utilitiesPerMonth: z.number(),
    amenities: amenitiesSchema,
    available: z.boolean(),
    availableFrom: availableFromSchema.optional(),
    images: z.array(z.string()),
    floor: floorSchema,
    order: z.number(),
    seo: seoSchema.optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    hero: z.object({
      headline: bilingualString,
      subheadline: bilingualString,
      cta: bilingualString,
      images: z.object({
        desktop: z.string(),
        tablet: z.string(),
        mobile: z.string(),
      }),
    }).optional(),
    sectionSubheadline: bilingualString.optional(),
    features: z.array(z.object({
      icon: z.enum(FEATURE_ICON_OPTIONS),
      label: bilingualString,
    })).optional(),
    editorialBlocks: z.array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('richText'),
          body: bilingualString,
        }),
        z.object({
          type: z.literal('callout'),
          title: bilingualString,
          body: bilingualString,
          tone: z.enum(['info', 'success', 'warning']),
        }),
        z.object({
          type: z.literal('ctaRow'),
          text: bilingualString,
          buttonLabel: bilingualString,
          buttonHref: bilingualString,
        }),
      ]),
    ).optional(),
    seo: seoSchema.optional(),
    faq: z.array(z.object({
      question: bilingualString,
      answer: bilingualString,
    })).optional(),
    // Exchange students page fields
    heading: bilingualString.optional(),
    subheading: bilingualString.optional(),
    intro: bilingualString.optional(),
    highlights: z.array(z.object({
      icon: z.string(),
      title: bilingualString,
      description: bilingualString,
    })).optional(),
    whatsIncluded: bilingualString.optional(),
    aboutVallendar: bilingualString.optional(),
    remoteBooking: bilingualString.optional(),
    ctaText: bilingualString.optional(),
  }),
});

const settings = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/settings' }),
  schema: z.object({
    propertyName: z.string(),
    propertyNameAccent: z.string(),
    address: z.object({
      street: z.string(),
      city: z.string(),
    }),
    email: z.string(),
    phone: z.string(),
    phoneDisplay: z.string(),
  }),
});

export const collections = { apartments, pages, settings };
