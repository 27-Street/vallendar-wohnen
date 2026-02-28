export const RICH_TEXT_CONFIG_SIGNATURE = 'cms-richtext-v1-2026-02-28';

export const RICH_TEXT_MARKED_OPTIONS = {
  gfm: true,
  breaks: true,
} as const;

export const RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'code',
  'pre',
  'hr',
  'br',
  'img',
] as const;

export const RICH_TEXT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'loading'],
};

export const RICH_TEXT_ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'] as const;
