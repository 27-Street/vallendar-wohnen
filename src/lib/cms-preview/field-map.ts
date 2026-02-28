export const HOME_PREVIEW_FIELD_MAP = {
  'hero.headline': '[data-cms-path="hero.headline"]',
  'hero.subheadline': '[data-cms-path="hero.subheadline"]',
  'hero.cta': '[data-cms-path="hero.cta"]',
  'hero.images.desktop': '[data-cms-path="hero.images.desktop"]',
  'hero.images.tablet': '[data-cms-path="hero.images.tablet"]',
  'hero.images.mobile': '[data-cms-path="hero.images.mobile"]',
  'welcomeSpotlight.eyebrow': '[data-cms-path="welcomeSpotlight.eyebrow"]',
  'welcomeSpotlight.headline': '[data-cms-path="welcomeSpotlight.headline"]',
  'welcomeSpotlight.body': '[data-cms-path="welcomeSpotlight.body"]',
  'welcomeSpotlight.ctaLabel': '[data-cms-path="welcomeSpotlight.ctaLabel"]',
  'welcomeSpotlight.ctaHref': '[data-cms-path="welcomeSpotlight.ctaHref"]',
  'welcomeSpotlight.image': '[data-cms-path="welcomeSpotlight.image"]',
  sectionSubheadline: '[data-cms-path="sectionSubheadline"]',
  features: '[data-cms-path="features"]',
  editorialBlocks: '[data-cms-path="editorialBlocks"]',
  'seo.title': '[data-cms-path="seo.title"]',
  'seo.description': '[data-cms-path="seo.description"]',
  'seo.ogImage': '[data-cms-path="seo.ogImage"]',
} as const;

export const APARTMENT_PREVIEW_FIELD_MAP = {
  name: '[data-cms-path="name"]',
  tagline: '[data-cms-path="tagline"]',
  description: '[data-cms-path="description"]',
  size: '[data-cms-path="size"]',
  rooms: '[data-cms-path="rooms"]',
  floor: '[data-cms-path="floor"]',
  maxOccupants: '[data-cms-path="maxOccupants"]',
  pricePerMonth: '[data-cms-path="pricePerMonth"]',
  utilitiesPerMonth: '[data-cms-path="utilitiesPerMonth"]',
  totalRent: '[data-cms-path="totalRent"]',
  available: '[data-cms-path="available"]',
  availableFrom: '[data-cms-path="availableFrom"]',
  amenities: '[data-cms-path="amenities"]',
  images: '[data-cms-path="images"]',
  'seo.title': '[data-cms-path="seo.title"]',
  'seo.description': '[data-cms-path="seo.description"]',
  'seo.ogImage': '[data-cms-path="seo.ogImage"]',
} as const;

export const HOME_REQUIRED_PREVIEW_PATHS = Object.keys(HOME_PREVIEW_FIELD_MAP);
export const APARTMENT_REQUIRED_PREVIEW_PATHS = Object.keys(APARTMENT_PREVIEW_FIELD_MAP);
