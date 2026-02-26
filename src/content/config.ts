import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const bilingualString = z.object({
  de: z.string(),
  en: z.string(),
});

const apartments = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/apartments' }),
  schema: z.object({
    name: z.string(),
    tagline: bilingualString,
    description: bilingualString,
    size: z.number(),
    rooms: z.string(),
    maxOccupants: z.number(),
    pricePerMonth: z.number(),
    utilitiesPerMonth: z.number(),
    amenities: z.array(z.string()),
    available: z.boolean(),
    availableFrom: z.string().optional(),
    images: z.array(z.string()),
    floor: z.string(),
    order: z.number(),
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
    }).optional(),
    sectionSubheadline: bilingualString.optional(),
    features: z.array(z.object({
      icon: z.string(),
      label: bilingualString,
    })).optional(),
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
