// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

function adminCmsDevRewritePlugin() {
  return {
    name: 'admin-cms-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const [pathname, query = ''] = req.url.split('?');
        if (pathname === '/admin' || pathname === '/admin/') {
          req.url = `/admin/index.html${query ? `?${query}` : ''}`;
        }

        next();
      });
    },
  };
}

// https://astro.build/config
// Update 'site' to the production domain once available
export default defineConfig({
  site: 'https://lucky-cucurucho-b639b6.netlify.app',
  output: 'static',
  compressHTML: true,
  integrations: [icon()],
  vite: {
    plugins: [tailwindcss(), adminCmsDevRewritePlugin()],
  }
});
