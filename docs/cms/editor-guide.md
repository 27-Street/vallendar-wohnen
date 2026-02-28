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
3. Work inside **Wohnungen**, **Seiten**, and **Guides**.

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
- Disk path: `public/images`
- Public URL: `/images/...`

Existing media availability:
- Existing assets under `public/images/**` are available in the CMS media picker and in **Medien** (recursive listing, including nested folders).
- You can reuse existing files or upload new ones in the same media tree.

Apartment image collections:
- Every apartment has its own `Bilder` collection.
- Apartment uploads are written to `public/images/apartments/{{slug}}` (served as `/images/apartments/{{slug}}/...`).
- Each image entry includes:
  - `Bilddatei`
  - `Bildtyp` (living, bedroom, kitchen, etc.)
  - optional bilingual caption
  - `Primäres Bild` flag
- The primary image is used for card/SEO fallback. If no primary image is set, the first image is used.

Page and guide media folders:
- Homepage hero uploads: `public/images/hero` (`/images/hero/...`).
- Other page uploads: `public/images/pages/<page-name>` (`/images/pages/<page-name>/...`).
- Guide uploads: `public/images/guides/{{slug}}` (`/images/guides/{{slug}}/...`).
- Existing files can be selected from **Medien** even if they were uploaded before this workflow.

Reference vs physical delete:
- Remove an item from apartment `Bilder` list: removes only the content reference.
- Delete a file in **Medien**: physically deletes the file from the repository.
- If you delete a still-referenced file in **Medien**, `npm run validate` fails with a missing-file error.
- Unreferenced files are reported as warnings so they can be cleaned up manually.

Recommendations:
- Use descriptive filenames.
- Prefer web-friendly formats (`.webp`, `.jpg`, `.png`).
- Keep file sizes reasonable for performance.

## 7. SEO Fields

Apartments, homepage, and guides support SEO fields:
- Title (DE/EN)
- Description (DE/EN)
- OG image
- OG image alt text (DE/EN)
- Keywords
- Optional canonical path / noindex for advanced cases

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
