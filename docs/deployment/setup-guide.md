---
type: reference
title: Deployment & Setup Guide
created: 2026-02-26
tags:
  - deployment
  - netlify
  - setup
related:
  - "[[Phase-05-Deployment-And-Production]]"
---

# Deployment & Setup Guide

This guide walks through deploying the Vallendar Apartments website to Netlify, configuring authentication for the CMS, connecting a custom domain, and updating SEO settings for the live site.

## Prerequisites

- A GitHub account with access to this repository
- A Netlify account (free tier is sufficient)
- A custom domain (optional, can be added later)

## 1. Create a Netlify Account and Connect the Repository

1. Go to [netlify.com](https://www.netlify.com) and sign up (or log in) with your GitHub account.
2. Click **"Add new site"** > **"Import an existing project"**.
3. Select **GitHub** as the Git provider and authorize Netlify to access your repositories.
4. Choose this repository from the list.
5. Netlify will auto-detect the build settings from `netlify.toml`:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 20
6. Click **"Deploy site"**. Netlify will build and deploy the site. The first deploy takes 1-2 minutes.
7. Once deployed, Netlify assigns a random URL like `https://random-name.netlify.app`. You can rename this under **Site settings** > **Domain management** > **Change site name**.

## 2. Enable Netlify Identity and Invite Users

Netlify Identity provides authentication for the Decap CMS admin panel.

1. In your Netlify dashboard, go to **Site settings** > **Identity**.
2. Click **"Enable Identity"**.
3. Under **Registration preferences**, select **"Invite only"** (prevents strangers from creating accounts).
4. Under **External providers**, you can optionally enable Google or other OAuth providers for easier login.
5. Go to the **Identity** tab in the top nav and click **"Invite users"**.
6. Enter Yannik's email address and send the invitation.
7. Yannik will receive an email with a confirmation link. After clicking it and setting a password, he can log in at `https://your-site.netlify.app/admin/`.
8. **Enable Git Gateway:** Go to **Site settings** > **Identity** > **Services** > **Git Gateway** and click **"Enable Git Gateway"**. This allows the CMS to commit changes to the repository on behalf of authenticated users.

## 3. Configure a Custom Domain

Once Yannik has purchased a domain:

1. In Netlify, go to **Site settings** > **Domain management** > **Add custom domain**.
2. Enter the domain (e.g., `www.vallendar-apartments.de`).
3. Netlify will prompt you to configure DNS. You have two options:

   **Option A: Use Netlify DNS (recommended)**
   - Point the domain's nameservers to Netlify's nameservers (shown in the dashboard).
   - Netlify manages all DNS records automatically.

   **Option B: External DNS**
   - Add a CNAME record pointing `www` to your Netlify site URL (e.g., `random-name.netlify.app`).
   - For the apex domain (no `www`), add an A record or ALIAS record as instructed by Netlify.

4. Netlify automatically provisions a free SSL certificate via Let's Encrypt. This typically takes a few minutes after DNS propagates.
5. Under **Domain management**, enable **"Force HTTPS"** to redirect all HTTP traffic to HTTPS.

## 4. Set Up Netlify Forms Notifications

The contact/inquiry form is already configured with `data-netlify="true"`. Netlify automatically detects and processes these forms during the build.

1. In Netlify, go to **Site settings** > **Forms** > **Form notifications**.
2. Click **"Add notification"** > **"Email notification"**.
3. Configure:
   - **Email to notify:** Yannik's email address
   - **Form:** Select the inquiry form (it will appear after the first successful build)
   - **Subject line:** e.g., "Neue Anfrage / New Inquiry — Vallendar Apartments"
4. Save. Yannik will now receive an email for every form submission.
5. You can also view all submissions in the Netlify dashboard under **Forms**.

## 5. Update URLs for the Live Domain

Once the custom domain is active, update these placeholder values:

### `astro.config.mjs`

Change the `site` property from the placeholder to the real domain:

```js
site: 'https://www.your-domain.de',
```

### `public/robots.txt`

Update the Sitemap URL:

```
Sitemap: https://www.your-domain.de/sitemap-index.xml
```

### `public/admin/config.yml`

Update the site and display URLs:

```yaml
site_url: https://www.your-domain.de
display_url: https://www.your-domain.de
```

### SEO / Open Graph

The `SEOHead.astro` component derives canonical URLs and OG URLs from `Astro.site`, so updating `astro.config.mjs` is sufficient for most SEO tags. Verify by checking the deployed HTML source for correct `og:url` and `canonical` values.

After making these changes, commit and push. Netlify will automatically rebuild and deploy.

## 6. Cost Breakdown

| Item | Cost |
|------|------|
| Netlify hosting (free tier) | **$0/month** |
| Netlify Forms (free tier, up to 100 submissions/month) | **$0/month** |
| Netlify Identity (free tier, up to 1,000 active users) | **$0/month** |
| SSL certificate (Let's Encrypt via Netlify) | **$0/month** |
| Custom domain (.de) | **~$10-15/year** |
| **Total annual cost** | **~$10-15/year** |

This is well within the target budget of ~$10-15/year.

## 7. Ongoing Maintenance

- **Content updates:** Yannik logs into `/admin/` to edit apartment listings, prices, and availability. Changes are committed to Git automatically via the CMS.
- **Code updates:** Push changes to the `main` branch. Netlify auto-deploys on every push.
- **Domain renewal:** Renew the domain annually with the registrar.
- **Monitoring:** Netlify provides basic analytics and deploy logs. Check the dashboard periodically for failed builds or form submission issues.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CMS login not working | Ensure Identity is enabled and Git Gateway is active in Netlify settings |
| Forms not appearing in dashboard | Verify the form has `data-netlify="true"` in the HTML and redeploy |
| Build fails | Check the deploy log in Netlify; run `npm run build` locally to reproduce |
| SSL certificate not provisioning | Verify DNS is correctly pointing to Netlify; wait up to 24h for propagation |
| Site redirects not working | Check `netlify.toml` redirect rules and `public/_redirects` fallback |
