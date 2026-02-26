export interface Apartment {
  id: string;
  name: string;
  tagline: { de: string; en: string };
  description: { de: string; en: string };
  size: number;
  rooms: string;
  maxOccupants: number;
  pricePerMonth: number;
  utilitiesPerMonth: number;
  amenities: string[];
  available: boolean;
  availableFrom?: string;
  images: string[];
  floor: string;
}

export const apartments: Apartment[] = [
  {
    id: 'rheinblick',
    name: 'Rheinblick',
    tagline: {
      de: 'Wohnen mit Weitblick',
      en: 'Living with a View',
    },
    description: {
      de: 'Helle Dachgeschosswohnung mit Blick Richtung Rheintal. Der offene Wohn-Essbereich und die moderne Einbauküche machen diese Wohnung zum idealen Rückzugsort nach einem langen Unitag. Voll möbliert und bezugsfertig.',
      en: 'Bright top-floor apartment with views toward the Rhine valley. The open-plan living and dining area combined with a modern fitted kitchen make this the perfect retreat after a long day at university. Fully furnished and ready to move in.',
    },
    size: 42,
    rooms: '2 Zimmer',
    maxOccupants: 1,
    pricePerMonth: 620,
    utilitiesPerMonth: 150,
    amenities: ['WLAN', 'Einbauküche', 'Waschmaschine', 'Schreibtisch', 'Kleiderschrank', 'Balkon'],
    available: true,
    availableFrom: '2026-04-01',
    images: ['/images/apartments/rheinblick-1.jpg', '/images/apartments/rheinblick-2.jpg', '/images/apartments/rheinblick-3.jpg'],
    floor: '2. OG',
  },
  {
    id: 'alte-muehle',
    name: 'Alte Mühle',
    tagline: {
      de: 'Gemütlichkeit trifft Stil',
      en: 'Comfort Meets Style',
    },
    description: {
      de: 'Charmante Erdgeschosswohnung mit eigenem Eingang und kleiner Terrasse. Die warme Holzoptik und großzügige Raumaufteilung schaffen eine einladende Atmosphäre. Perfekt für Studierende, die Ruhe und Charakter schätzen.',
      en: 'Charming ground-floor apartment with its own entrance and a small terrace. Warm wood accents and a generous layout create an inviting atmosphere. Perfect for students who value peace and character.',
    },
    size: 38,
    rooms: '1,5 Zimmer',
    maxOccupants: 1,
    pricePerMonth: 550,
    utilitiesPerMonth: 130,
    amenities: ['WLAN', 'Einbauküche', 'Waschmaschine', 'Schreibtisch', 'Terrasse', 'Fahrradstellplatz'],
    available: true,
    availableFrom: '2026-04-01',
    images: ['/images/apartments/alte-muehle-1.jpg', '/images/apartments/alte-muehle-2.jpg', '/images/apartments/alte-muehle-3.jpg'],
    floor: 'EG',
  },
  {
    id: 'zur-linde',
    name: 'Zur Linde',
    tagline: {
      de: 'Kompakt und mittendrin',
      en: 'Compact and Central',
    },
    description: {
      de: 'Clever geschnittene Wohnung im ersten Obergeschoss mit allem, was man braucht. Die zentrale Lage und kurze Wege zur WHU machen den Alltag unkompliziert. Ideal für den fokussierten MBA- oder Masterstudierenden.',
      en: 'Cleverly designed first-floor apartment with everything you need. The central location and short walk to WHU make daily life effortless. Ideal for the focused MBA or master\'s student.',
    },
    size: 35,
    rooms: '1 Zimmer',
    maxOccupants: 1,
    pricePerMonth: 490,
    utilitiesPerMonth: 120,
    amenities: ['WLAN', 'Einbauküche', 'Waschmaschine', 'Schreibtisch', 'Kleiderschrank'],
    available: false,
    images: ['/images/apartments/zur-linde-1.jpg', '/images/apartments/zur-linde-2.jpg', '/images/apartments/zur-linde-3.jpg'],
    floor: '1. OG',
  },
];
