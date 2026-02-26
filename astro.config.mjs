// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// Update 'site' to the production domain once available
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  compressHTML: true,
  integrations: [icon(), sitemap({
    i18n: {
      defaultLocale: 'de',
      locales: {
        de: 'de-DE',
        en: 'en-US',
      },
    },
    filter: (page) => !page.includes('/admin/'),
  })],
  vite: {
    plugins: [tailwindcss()]
  }
});