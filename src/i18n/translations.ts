export type Language = 'de' | 'en';

export const translations = {
  de: {
    nav: {
      home: 'Home',
      apartments: 'Wohnungen',
      contact: 'Kontakt',
    },
    hero: {
      headline: 'Studentisches Wohnen in Vallendar',
      subheadline: 'Möblierte Apartments direkt gegenüber der WHU — Ihr Zuhause während des Studiums.',
      cta: 'Wohnungen entdecken',
    },
    sections: {
      apartments: 'Unsere Wohnungen',
      features: 'Ihre Vorteile',
      contact: 'Kontakt',
    },
    apartment: {
      size: 'Größe',
      rooms: 'Zimmer',
      floor: 'Stockwerk',
      maxOccupants: 'Max. Bewohner',
      rent: 'Kaltmiete',
      utilities: 'Nebenkosten',
      total: 'Gesamtmiete',
      perMonth: '/ Monat',
      amenities: 'Ausstattung',
      availableFrom: 'Verfügbar ab',
      learnMore: 'Mehr erfahren',
      backToAll: 'Zurück zu allen Wohnungen',
      inquiry: 'Interesse? Schreiben Sie uns!',
      inquiryText: 'Kontaktieren Sie uns für eine Besichtigung oder weitere Informationen.',
      inquiryCta: 'Kontakt aufnehmen',
      photoPlaceholder: 'Foto folgt',
      rentalCosts: 'Mietkosten',
    },
    availability: {
      available: 'Verfügbar',
      occupied: 'Vermietet',
    },
    features: {
      nearWhu: '2 Min. zur WHU',
      furnished: 'Voll möbliert',
      kitchen: 'Einbauküche',
      wifi: 'WLAN inklusive',
      laundry: 'Waschmaschine',
      flexible: 'Flexible Mietdauer',
    },
    contact: {
      heading: 'Kontakt',
      formPlaceholder: 'Kontaktformular wird eingerichtet — in der Zwischenzeit erreichen Sie uns per E-Mail.',
      address: 'Adresse',
      email: 'E-Mail',
      phone: 'Telefon',
    },
    legal: {
      impressum: 'Impressum',
      datenschutz: 'Datenschutz',
      comingSoon: 'Wird ergänzt.',
    },
    footer: {
      copyright: 'Alle Rechte vorbehalten.',
    },
  },
  en: {
    nav: {
      home: 'Home',
      apartments: 'Apartments',
      contact: 'Contact',
    },
    hero: {
      headline: 'Student Living in Vallendar',
      subheadline: 'Furnished apartments right across from WHU — your home during your studies.',
      cta: 'Discover Apartments',
    },
    sections: {
      apartments: 'Our Apartments',
      features: 'Your Benefits',
      contact: 'Contact',
    },
    apartment: {
      size: 'Size',
      rooms: 'Rooms',
      floor: 'Floor',
      maxOccupants: 'Max. Occupants',
      rent: 'Base Rent',
      utilities: 'Utilities',
      total: 'Total Rent',
      perMonth: '/ month',
      amenities: 'Amenities',
      availableFrom: 'Available from',
      learnMore: 'Learn more',
      backToAll: 'Back to all apartments',
      inquiry: 'Interested? Get in touch!',
      inquiryText: 'Contact us to schedule a viewing or for more information.',
      inquiryCta: 'Contact us',
      photoPlaceholder: 'Photo coming soon',
      rentalCosts: 'Rental Costs',
    },
    availability: {
      available: 'Available',
      occupied: 'Occupied',
    },
    features: {
      nearWhu: '2 Min. to WHU',
      furnished: 'Fully Furnished',
      kitchen: 'Fitted Kitchen',
      wifi: 'Wi-Fi Included',
      laundry: 'Washing Machine',
      flexible: 'Flexible Lease Terms',
    },
    contact: {
      heading: 'Contact',
      formPlaceholder: 'Contact form coming soon — in the meantime, reach us by email.',
      address: 'Address',
      email: 'Email',
      phone: 'Phone',
    },
    legal: {
      impressum: 'Imprint',
      datenschutz: 'Privacy Policy',
      comingSoon: 'Coming soon.',
    },
    footer: {
      copyright: 'All rights reserved.',
    },
  },
} as const;

export type Translations = typeof translations[Language];

export function getTranslation(lang: Language): Translations {
  return translations[lang];
}
