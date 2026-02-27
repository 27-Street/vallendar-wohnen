# Custom Domain Migration Checklist

Use this checklist when switching from the temporary Netlify domain to your final production domain.

## Preconditions
- Final domain purchased and DNS access confirmed
- SSL certificate active in Netlify
- Netlify primary domain configured

## Same-Release Tasks
1. Update `site` in `astro.config.mjs` to the final domain.
2. Verify `/robots.txt` outputs the final-domain sitemap URL.
3. Verify `/sitemap-index.xml` and `/sitemap.xml` use final-domain URLs.
4. Update `site_url` and `display_url` in `public/admin/config.yml`.
5. Deploy and run CI checks (`validate`, `build`, `seo:audit`, `links:audit`).

## Redirect and Canonical Tasks
1. Configure Netlify 301 primary-domain redirect from old host to new host.
2. Confirm path and query are preserved on redirect.
3. Confirm canonical URLs point only to final domain.
4. Confirm no mixed-host URLs remain in HTML source or sitemap.

## Search Console Tasks
1. Add and verify final domain property.
2. Submit `https://<final-domain>/sitemap-index.xml`.
3. Request re-indexing for key pages:
   - `/de/`
   - `/en/`
   - `/de/austauschstudierende/`
   - `/en/exchange-students/`
   - `/de/guides/`
   - `/en/guides/`

## Post-Migration QA (first 14 days)
- Check indexed page host in Search Console
- Check crawl errors and redirect issues
- Check canonical selection for top landing pages
- Check organic inquiries trend for regression
