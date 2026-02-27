import type { APIContext } from 'astro';
import { buildRobotsTxt, getSiteOrigin } from '../lib/seo';

export function GET({ site }: APIContext): Response {
  const siteOrigin = getSiteOrigin(site);
  const content = buildRobotsTxt(siteOrigin);

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
