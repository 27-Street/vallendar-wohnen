---
type: guide
title: CMS Editor Guide
created: 2026-02-27
tags:
  - cms
  - decap
  - workflow
---

# CMS Editor Guide

This guide explains how to edit apartments and homepage content in Decap CMS with the CMS V2 workflow.

## 1. Login

1. Open `/admin/` on the live site.
2. Sign in with your invited Netlify Identity account.
3. Work inside **Wohnungen** and **Seiten > Startseite** for this release wave.

## 2. Draft and Review Workflow

The CMS uses `editorial_workflow`.

1. Create or edit an entry.
2. Click **Save** to create a draft.
3. Click **Publish** when ready.
4. In review status, verify the changes and then complete publishing.

Notes:
- Unpublished drafts are not visible on the live website.
- Publishing creates commits and triggers a Netlify deploy.

## 3. Bilingual Content Rules

Every required field must be filled in both languages:
- `Deutsch`
- `English`

If one language is missing, validation fails and publishing is blocked.

## 4. WYSIWYG Usage

WYSIWYG fields support:
- Headings
- Paragraphs
- Lists
- Links
- Bold/italic
- Images

Use these fields carefully:
- Apartment `Beschreibung`
- Homepage `Abschnitt-Unterüberschrift`
- Homepage `Redaktions-Blöcke` rich text content

Homepage hero media:
- Hero images (`desktop`, `tablet`, `mobile`) are edited in CMS media fields.
- The live homepage and CMS preview read those image paths directly (no hardcoded hero image in page code).

Security note:
- Unsafe HTML is sanitized before rendering.

## 5. Homepage Editorial Blocks

`Redaktions-Blöcke` are structured block types (fixed, no free page builder):

1. `Rich Text`: general formatted content.
2. `Callout`: highlighted info card with tone (`info`, `success`, `warning`).
3. `CTA Zeile`: short text + button label + button link.

For CTA links, use localized paths:
- German: `/de/...`
- English: `/en/...`

## 6. Image Upload Rules

Uploaded files go to:
- Disk path: `public/images/uploads`
- Public URL: `/images/uploads/...`

Recommendations:
- Use descriptive filenames.
- Prefer web-friendly formats (`.webp`, `.jpg`, `.png`).
- Keep file sizes reasonable for performance.

## 7. SEO Fields

Apartments and homepage have optional SEO overrides:
- Title (DE/EN)
- Description (DE/EN)
- OG image

If SEO fields are empty, the site falls back to default generated metadata.

## 8. Publish Checklist

Before publishing:

1. Both `Deutsch` and `English` fields are complete.
2. WYSIWYG formatting looks correct.
3. Links open and point to correct localized pages.
4. Image paths resolve in preview.
5. SEO title/description are present when needed.

After publishing:

1. Wait for Netlify deploy to finish.
2. Spot-check homepage and apartment detail pages in both languages.
