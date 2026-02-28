(function () {
  const cms = window.CMS || window.DecapCms || window.DecapCmsApp;
  if (!cms) return;

  const h = window.h || (window.React && window.React.createElement);
  if (!h) {
    console.error('[cms-preview] Missing element factory (window.h).');
    return;
  }

  const styleRegistry = new Set();
  const registerStyleOnce = (href) => {
    if (!href || styleRegistry.has(href)) return;
    styleRegistry.add(href);
    cms.registerPreviewStyle(href);
  };

  registerStyleOnce('/admin/preview.css');

  const resolveHref = (href, basePath) => {
    try {
      return new URL(href, `${window.location.origin}${basePath}`).toString();
    } catch {
      return href;
    }
  };

  const loadLiveStyles = async () => {
    const paths = ['/de/', '/en/', '/'];
    for (const path of paths) {
      try {
        const response = await fetch(path, { credentials: 'same-origin' });
        if (!response.ok) continue;

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const stylesheetLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'));
        if (stylesheetLinks.length === 0) continue;

        stylesheetLinks.forEach((linkEl) => {
          const href = linkEl.getAttribute('href');
          if (!href) return;
          const resolved = resolveHref(href, path);
          registerStyleOnce(resolved);
        });

        return;
      } catch {
        // Try next path.
      }
    }
  };

  loadLiveStyles();

  const toJS = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value.toJS === 'function') return value.toJS();
    return value;
  };

  const localized = (value, lang) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value[lang] || value.de || value.en || '';
  };

  const asNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const sanitizeHref = (href) => {
    const raw = String(href || '').trim();
    if (!raw) return '#';
    if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(raw)) return raw;
    return '#';
  };

  const renderInlineMarkdown = (line) => {
    let output = escapeHtml(line);
    output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
    output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = sanitizeHref(href);
      const rel = /^https?:\/\//i.test(safeHref) ? ' rel="noopener noreferrer"' : '';
      const target = /^https?:\/\//i.test(safeHref) ? ' target="_blank"' : '';
      return `<a href="${escapeHtml(safeHref)}"${rel}${target}>${label}</a>`;
    });
    output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    output = output.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
    output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    return output;
  };

  const markdownToHtml = (markdown) => {
    if (!markdown) return '';

    const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let i = 0;

    const isBoundary = (line) => (
      /^#{1,6}\s+/.test(line)
      || /^\s*[-*+]\s+/.test(line)
      || /^\s*\d+\.\s+/.test(line)
      || /^\s*>\s?/.test(line)
    );

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(heading[2].trim())}</h${level}>`);
        i += 1;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, '').trim());
          i += 1;
        }
        html.push(`<blockquote>${renderInlineMarkdown(quote.join(' '))}</blockquote>`);
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, '').trim());
          i += 1;
        }
        html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
          i += 1;
        }
        html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
        continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !isBoundary(lines[i])) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      html.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br />')}</p>`);
    }

    return html.join('');
  };

  const richTextNode = (markdown, className) => h('div', {
    className: ['richtext', className || ''].filter(Boolean).join(' '),
    dangerouslySetInnerHTML: {
      __html: markdownToHtml(markdown),
    },
  });

  const resolveAssetUrl = (value, getAsset) => {
    if (!value) return '';
    if (typeof getAsset !== 'function') return String(value);

    const asset = getAsset(value);
    if (!asset) return String(value);
    if (typeof asset === 'string') return asset;
    if (typeof asset.toString === 'function') return asset.toString();
    return String(value);
  };

  const normalizeImages = (images) => {
    if (!Array.isArray(images)) return [];
    return images
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') {
          return { image: entry, kind: 'other', isPrimary: false };
        }
        return {
          image: entry.image,
          kind: entry.kind || 'other',
          caption: entry.caption,
          isPrimary: !!entry.isPrimary,
        };
      })
      .filter(Boolean)
      .filter((entry) => entry.image);
  };

  const HOME_PREVIEW_FALLBACK_APARTMENTS = [
    {
      name: 'Rheinblick',
      tagline: 'Wohnen mit Weitblick',
      size: 42,
      rooms: '2 Zimmer',
      pricePerMonth: 620,
      image: '/images/apartments/rheinblick/living.webp',
      available: true,
      availableFrom: '2026-04-01',
    },
    {
      name: 'Alte Muehle',
      tagline: 'Gemuetlichkeit trifft Stil',
      size: 38,
      rooms: '1.5 Zimmer',
      pricePerMonth: 580,
      image: '/images/apartments/alte-muehle/living.webp',
      available: true,
      availableFrom: '2026-04-01',
    },
    {
      name: 'Zur Linde',
      tagline: 'Kompakt und mittendrin',
      size: 35,
      rooms: '1 Zimmer',
      pricePerMonth: 490,
      image: '/images/apartments/zur-linde/living.webp',
      available: false,
      availableFrom: '',
    },
  ];

  const formatDate = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  };

  const availabilityBadge = ({ available, availableFrom, variant }) => {
    const hasDate = Boolean(available && availableFrom);
    const label = !available
      ? 'Vermietet'
      : hasDate
        ? `Verfuegbar ab ${formatDate(availableFrom)}`
        : 'Verfuegbar';

    const colorClass = variant === 'hero'
      ? (!available
        ? 'bg-neutral-900/60 text-neutral-200 backdrop-blur-sm'
        : 'bg-white/15 text-white/90 backdrop-blur-sm ring-1 ring-white/20')
      : (!available
        ? 'bg-neutral-800/80 text-neutral-100 backdrop-blur-sm'
        : 'bg-white/90 text-neutral-700 backdrop-blur-sm ring-1 ring-neutral-200');

    const dotClass = !available
      ? 'bg-neutral-400'
      : hasDate
        ? 'bg-amber-500'
        : 'bg-emerald-500';

    return h(
      'span',
      {
        className: [
          'inline-flex items-center gap-1.5 rounded-full font-medium tracking-wide',
          variant === 'hero' ? 'px-4 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px] uppercase',
          colorClass,
        ].join(' '),
      },
      h('span', { className: `h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}` }),
      label,
    );
  };

  const iconArrow = (direction, className) => {
    if (direction === 'left') {
      return h(
        'svg',
        { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: className || 'h-4 w-4' },
        h('path', { d: 'M15.75 19.5 8.25 12l7.5-7.5', strokeLinecap: 'round', strokeLinejoin: 'round' }),
      );
    }

    if (direction === 'down') {
      return h(
        'svg',
        { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: className || 'h-4 w-4' },
        h('path', { d: 'M12 5v14m7-7-7 7-7-7', strokeLinecap: 'round', strokeLinejoin: 'round' }),
      );
    }

    return h(
      'svg',
      { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: className || 'h-4 w-4' },
      h('path', { d: 'M5 12h14m-7-7 7 7-7 7', strokeLinecap: 'round', strokeLinejoin: 'round' }),
    );
  };

  const iconCheck = () => h(
    'svg',
    { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', className: 'h-5 w-5 shrink-0 text-accent-600' },
    h('path', { d: 'm4.5 12.75 6 6 9-13.5', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  );

  const previewHeader = () => h(
    'header',
    { className: 'sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur-md' },
    h(
      'div',
      { className: 'mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6' },
      h(
        'a',
        { href: '#', className: 'text-lg font-bold tracking-tight text-neutral-900' },
        'Vallendar',
        h('span', { className: 'text-accent-600' }, 'Wohnen'),
      ),
      h(
        'nav',
        { className: 'hidden items-center gap-6 md:flex', 'aria-label': 'Main navigation preview' },
        h('a', { href: '#', className: 'relative text-sm font-medium text-accent-700' }, 'Home'),
        h('a', { href: '#', className: 'relative text-sm font-medium text-neutral-600' }, 'Wohnungen'),
        h('a', { href: '#', className: 'relative text-sm font-medium text-neutral-600' }, 'FAQ'),
        h(
          'span',
          { className: 'ml-2 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-600' },
          'EN',
        ),
      ),
    ),
  );

  const previewFooter = () => h(
    'footer',
    { className: 'border-t border-neutral-200 bg-neutral-900 text-neutral-300' },
    h(
      'div',
      { className: 'mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-12' },
      h(
        'div',
        { className: 'grid gap-8 sm:grid-cols-2 lg:grid-cols-3' },
        h(
          'div',
          null,
          h(
            'a',
            { href: '#', className: 'text-lg font-bold tracking-tight text-white' },
            'Vallendar',
            h('span', { className: 'text-accent-400' }, 'Wohnen'),
          ),
          h('address', { className: 'mt-3 not-italic text-sm leading-relaxed text-neutral-400' }, 'Musterstrasse 1', h('br'), '56179 Vallendar'),
        ),
        h(
          'div',
          null,
          h('h3', { className: 'text-sm font-semibold uppercase tracking-wider text-neutral-200' }, 'Kontakt'),
          h(
            'ul',
            { className: 'mt-3 space-y-2 text-sm text-neutral-400' },
            h('li', null, h('span', { className: 'text-neutral-500' }, 'E-Mail: '), 'info@vallendar-wohnen.de'),
            h('li', null, h('span', { className: 'text-neutral-500' }, 'Telefon: '), '+49 261 94 000 000'),
          ),
        ),
        h(
          'div',
          null,
          h('h3', { className: 'text-sm font-semibold uppercase tracking-wider text-neutral-200' }, 'Legal'),
          h(
            'ul',
            { className: 'mt-3 space-y-2 text-sm text-neutral-400' },
            h('li', null, h('a', { href: '#', className: 'transition-colors hover:text-accent-400' }, 'Impressum')),
            h('li', null, h('a', { href: '#', className: 'transition-colors hover:text-accent-400' }, 'Datenschutz')),
          ),
        ),
      ),
      h('div', { className: 'mt-8 border-t border-neutral-800 pt-6 text-center text-xs text-neutral-500' }, `© ${new Date().getFullYear()} VallendarWohnen. Alle Rechte vorbehalten.`),
    ),
  );

  const apartmentCard = (apartment, getAsset, index) => {
    const imageUrl = resolveAssetUrl(apartment.image, getAsset);
    const price = `${asNumber(apartment.pricePerMonth)} EUR / Monat`;

    return h(
      'a',
      {
        href: '#',
        key: `preview-apartment-${index}`,
        className: 'group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200 transition-all hover:shadow-lg hover:ring-accent-300 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2',
      },
      h(
        'div',
        { className: 'relative aspect-[4/3] overflow-hidden bg-neutral-100' },
        imageUrl
          ? h('img', { src: imageUrl, alt: apartment.name, loading: 'lazy', className: 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]' })
          : h('div', { className: 'absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm font-medium text-neutral-400' }, 'Foto folgt'),
        h('div', { className: 'absolute bottom-3 left-3' }, availabilityBadge({ available: apartment.available, availableFrom: apartment.availableFrom, variant: 'default' })),
      ),
      h(
        'div',
        { className: 'flex flex-1 flex-col p-5' },
        h('h3', { className: 'font-serif text-lg font-semibold text-neutral-900 transition-colors group-hover:text-accent-700' }, apartment.name),
        h('p', { className: 'mt-1 text-sm text-neutral-500' }, apartment.tagline),
        h(
          'div',
          { className: 'mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500' },
          h('span', null, `${apartment.size} m2`),
          h('span', { className: 'text-neutral-300' }, '·'),
          h('span', null, apartment.rooms),
          h('span', { className: 'text-neutral-300' }, '·'),
          h('span', { className: 'font-semibold text-neutral-900' }, price),
        ),
        h(
          'div',
          { className: 'mt-auto border-t border-neutral-100 pt-4' },
          h(
            'span',
            { className: 'inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 transition-all group-hover:gap-2.5' },
            'Mehr erfahren',
            iconArrow('right', 'h-4 w-4'),
          ),
        ),
      ),
    );
  };

  const featureIcon = (iconName) => h(
    'span',
    { className: 'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-100 text-accent-700' },
    h('span', { className: 'text-[10px] font-semibold uppercase tracking-wider' }, String(iconName || 'ic').slice(0, 2)),
  );

  const editorialBlock = (block, lang, index) => {
    if (!block || !block.type) return null;

    if (block.type === 'richText') {
      return h('div', { className: 'editorial-block editorial-block-info', key: `editorial-${index}` }, richTextNode(localized(block.body, lang)));
    }

    if (block.type === 'callout') {
      const toneClass = block.tone === 'success'
        ? 'editorial-block-success'
        : block.tone === 'warning'
          ? 'editorial-block-warning'
          : 'editorial-block-info';

      return h(
        'div',
        { className: `editorial-block ${toneClass}`, key: `editorial-${index}` },
        h('h3', { className: 'font-serif text-xl font-bold text-neutral-900' }, localized(block.title, lang)),
        richTextNode(localized(block.body, lang), 'mt-3'),
      );
    }

    if (block.type === 'ctaRow') {
      return h(
        'div',
        { className: 'editorial-block editorial-block-info flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', key: `editorial-${index}` },
        h('p', { className: 'text-sm font-medium text-neutral-800' }, localized(block.text, lang)),
        h(
          'a',
          {
            href: sanitizeHref(localized(block.buttonHref, lang)),
            className: 'inline-flex items-center gap-2 rounded-full bg-accent-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-800',
          },
          localized(block.buttonLabel, lang) || 'Mehr erfahren',
          iconArrow('right', 'h-4 w-4'),
        ),
      );
    }

    return null;
  };

  const previewShell = (mainChildren) => h(
    'div',
    { className: 'cms-preview-root' },
    h(
      'div',
      { className: 'flex min-h-screen flex-col bg-neutral-50 text-neutral-800 antialiased' },
      previewHeader(),
      h('main', { id: 'main-content', className: 'flex-1' }, mainChildren),
      previewFooter(),
    ),
  );

  const HomePreview = ({ entry, getAsset }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const lang = 'de';

    const hero = data.hero || {};
    const heroImages = hero.images || {};
    const heroDesktop = resolveAssetUrl(heroImages.desktop, getAsset);

    const sectionSubheadline = localized(data.sectionSubheadline, lang);
    const features = Array.isArray(data.features) ? data.features : [];
    const editorialBlocks = Array.isArray(data.editorialBlocks) ? data.editorialBlocks : [];
    const apartments = HOME_PREVIEW_FALLBACK_APARTMENTS;

    return previewShell([
      h(
        'section',
        { className: 'relative flex min-h-[85vh] items-center justify-center overflow-hidden sm:min-h-screen', key: 'home-hero' },
        h(
          'div',
          { className: 'absolute inset-0' },
          heroDesktop
            ? h('img', { src: heroDesktop, alt: '', className: 'h-full w-full object-cover', 'aria-hidden': 'true' })
            : h('div', { className: 'h-full w-full bg-gradient-to-br from-accent-800 via-accent-700 to-accent-900' }),
        ),
        h('div', { className: 'absolute inset-0 bg-gradient-to-b from-accent-950/70 via-accent-950/50 to-accent-950/70' }),
        h(
          'div',
          { className: 'relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6' },
          h('h1', { className: 'font-serif text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl' }, localized(hero.headline, lang) || 'Studentisches Wohnen in Vallendar'),
          h('p', { className: 'mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl' }, localized(hero.subheadline, lang)),
          h(
            'a',
            { href: '#wohnungen', className: 'btn-glass mt-16 inline-flex' },
            localized(hero.cta, lang) || 'Wohnungen entdecken',
            iconArrow('down', 'h-4 w-4'),
          ),
        ),
      ),

      h(
        'section',
        { id: 'wohnungen', className: 'bg-neutral-50 py-20 sm:py-28', key: 'home-apartments' },
        h(
          'div',
          { className: 'mx-auto max-w-6xl px-4 sm:px-6' },
          h('h2', { className: 'text-center font-serif text-3xl font-bold text-neutral-900 sm:text-4xl' }, 'Unsere Wohnungen'),
          richTextNode(sectionSubheadline, 'mx-auto mt-4 max-w-2xl text-center'),
          h(
            'div',
            { className: 'mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3' },
            apartments.map((apartment, index) => apartmentCard(apartment, getAsset, index)),
          ),
        ),
      ),

      editorialBlocks.length > 0
        ? h(
          'section',
          { className: 'bg-white py-16 sm:py-20', key: 'home-editorial' },
          h(
            'div',
            { className: 'mx-auto max-w-4xl px-4 sm:px-6' },
            h('div', { className: 'space-y-5' }, editorialBlocks.map((block, index) => editorialBlock(block, lang, index))),
          ),
        )
        : null,

      h(
        'section',
        { className: 'bg-white py-20 sm:py-28', key: 'home-features' },
        h(
          'div',
          { className: 'mx-auto max-w-6xl px-4 sm:px-6' },
          h('h2', { className: 'text-center font-serif text-3xl font-bold text-neutral-900 sm:text-4xl' }, 'Ihre Vorteile'),
          h(
            'div',
            { className: 'mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3' },
            features.map((feature, index) => h(
              'div',
              {
                className: 'flex items-center gap-4 rounded-xl bg-neutral-50 p-5 ring-1 ring-neutral-100 transition-all duration-200 hover:shadow-md hover:ring-accent-200',
                key: `feature-${index}`,
              },
              featureIcon(feature.icon),
              h('span', { className: 'text-sm font-semibold text-neutral-800' }, localized(feature.label, lang)),
            )),
          ),
        ),
      ),
    ]);
  };

  const apartmentGallery = (images, getAsset, apartmentName, lang) => {
    const normalized = normalizeImages(images).sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));

    if (normalized.length === 0) {
      return h('div', { className: 'rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 p-10 text-center text-sm text-neutral-500' }, `${apartmentName || 'Wohnung'}: Keine Bilder vorhanden`);
    }

    return h(
      'div',
      { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2' },
      normalized.slice(0, 5).map((entry, index) => {
        const imageUrl = resolveAssetUrl(entry.image, getAsset);
        const alt = localized(entry.caption, lang)
          ? `${apartmentName} - ${localized(entry.caption, lang)}`
          : `${apartmentName} - ${index + 1}`;

        const className = index === 0
          ? 'group relative overflow-hidden rounded-xl sm:col-span-2 lg:row-span-2 aspect-[16/10] sm:aspect-[16/10] lg:aspect-auto lg:h-full'
          : 'group relative overflow-hidden rounded-xl aspect-[4/3]';

        return h(
          'div',
          { className, key: `gallery-${index}` },
          imageUrl
            ? h('img', {
              src: imageUrl,
              alt,
              loading: index === 0 ? 'eager' : 'lazy',
              className: 'absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105',
            })
            : h('div', { className: 'absolute inset-0 bg-gradient-to-br from-accent-100 to-accent-200' }),
          h('div', { className: 'absolute inset-0 bg-accent-950/0 transition-colors duration-200 group-hover:bg-accent-950/10' }),
        );
      }),
    );
  };

  const ApartmentPreview = ({ entry, getAsset }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const lang = 'de';

    const images = normalizeImages(data.images || []);

    const name = data.name || 'Wohnung';
    const rooms = localized(data.rooms, lang);
    const floor = localized(data.floor, lang);
    const description = localized(data.description, lang);
    const amenities = Array.isArray(data.amenities) ? data.amenities : [];

    const rent = asNumber(data.pricePerMonth);
    const utilities = asNumber(data.utilitiesPerMonth);
    const total = rent + utilities;

    return previewShell([
      h(
        'section',
        { className: 'bg-gradient-to-br from-accent-950 via-accent-800 to-accent-950 pb-16 pt-32', key: 'apt-hero' },
        h(
          'div',
          { className: 'mx-auto max-w-6xl px-4 sm:px-6' },
          h(
            'a',
            { href: '#', className: 'inline-flex items-center gap-1 text-sm font-medium text-accent-200 transition-colors hover:text-white' },
            iconArrow('left', 'h-4 w-4'),
            'Zurueck zu allen Wohnungen',
          ),
          h(
            'div',
            { className: 'mt-6 flex flex-wrap items-start gap-4' },
            h('h1', { className: 'font-serif text-4xl font-bold text-white sm:text-5xl' }, name),
            h('div', { className: 'mt-1 sm:mt-2' }, availabilityBadge({ available: Boolean(data.available), availableFrom: data.availableFrom, variant: 'hero' })),
          ),
          h('p', { className: 'mt-3 text-lg text-accent-100/80' }, localized(data.tagline, lang)),
        ),
      ),

      h(
        'section',
        { className: 'bg-neutral-50 py-12', key: 'apt-gallery' },
        h('div', { className: 'mx-auto max-w-6xl px-4 sm:px-6' }, apartmentGallery(images, getAsset, name, lang)),
      ),

      h(
        'section',
        { className: 'bg-white py-16 sm:py-20', key: 'apt-details' },
        h(
          'div',
          { className: 'mx-auto max-w-6xl px-4 sm:px-6' },
          h(
            'div',
            { className: 'grid gap-10 lg:grid-cols-3' },
            h(
              'div',
              { className: 'lg:col-span-2' },
              h('h2', { className: 'font-serif text-2xl font-bold text-neutral-900' }, name),
              richTextNode(description, 'mt-4'),
              h(
                'div',
                { className: 'mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4' },
                h('div', { className: 'rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-sm' }, h('p', { className: 'text-xs font-medium uppercase tracking-wider text-neutral-500' }, 'Groesse'), h('p', { className: 'mt-1 text-lg font-bold text-neutral-900' }, `${data.size || '-'} m2`)),
                h('div', { className: 'rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-sm' }, h('p', { className: 'text-xs font-medium uppercase tracking-wider text-neutral-500' }, 'Zimmer'), h('p', { className: 'mt-1 text-lg font-bold text-neutral-900' }, rooms || '-')),
                h('div', { className: 'rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-sm' }, h('p', { className: 'text-xs font-medium uppercase tracking-wider text-neutral-500' }, 'Stockwerk'), h('p', { className: 'mt-1 text-lg font-bold text-neutral-900' }, floor || '-')),
                h('div', { className: 'rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-100 transition-shadow duration-200 hover:shadow-sm' }, h('p', { className: 'text-xs font-medium uppercase tracking-wider text-neutral-500' }, 'Max. Bewohner'), h('p', { className: 'mt-1 text-lg font-bold text-neutral-900' }, String(data.maxOccupants || '-'))),
              ),
            ),
            h(
              'div',
              null,
              h(
                'div',
                { className: 'rounded-2xl bg-neutral-50 p-6 ring-1 ring-neutral-200' },
                h('h3', { className: 'text-lg font-bold text-neutral-900' }, 'Mietkosten'),
                h(
                  'div',
                  { className: 'mt-5 space-y-3' },
                  h('div', { className: 'flex items-center justify-between text-sm' }, h('span', { className: 'text-neutral-600' }, 'Kaltmiete'), h('span', { className: 'font-semibold text-neutral-900' }, `${rent} EUR`)),
                  h('div', { className: 'flex items-center justify-between text-sm' }, h('span', { className: 'text-neutral-600' }, 'Nebenkosten'), h('span', { className: 'font-semibold text-neutral-900' }, `${utilities} EUR`)),
                  h('div', { className: 'border-t border-neutral-200 pt-3' }, h('div', { className: 'flex items-center justify-between' }, h('span', { className: 'font-semibold text-neutral-900' }, 'Gesamtmiete'), h('span', { className: 'text-xl font-bold text-accent-700' }, `${total} EUR`, h('span', { className: 'text-sm font-normal text-neutral-500' }, ' / Monat')))),
                ),
                h('div', { className: 'mt-6' }, availabilityBadge({ available: Boolean(data.available), availableFrom: data.availableFrom, variant: 'default' })),
              ),
            ),
          ),
        ),
      ),

      h(
        'section',
        { className: 'bg-neutral-50 py-16 sm:py-20', key: 'apt-amenities' },
        h(
          'div',
          { className: 'mx-auto max-w-6xl px-4 sm:px-6' },
          h('h2', { className: 'font-serif text-2xl font-bold text-neutral-900' }, 'Ausstattung'),
          h(
            'div',
            { className: 'mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4' },
            amenities.map((amenity, index) => h(
              'div',
              {
                className: 'flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200 transition-all duration-200 hover:shadow-sm hover:ring-accent-200',
                key: `amenity-${index}`,
              },
              iconCheck(),
              h('span', { className: 'min-w-0 break-words text-sm font-medium text-neutral-800' }, localized(amenity, lang)),
            )),
          ),
        ),
      ),

      h(
        'section',
        { className: 'bg-white py-16 sm:py-20', key: 'apt-form' },
        h(
          'div',
          { className: 'mx-auto max-w-3xl px-4 sm:px-6' },
          h('h2', { className: 'font-serif text-2xl font-bold text-neutral-900' }, 'Anfrage stellen'),
          h('p', { className: 'mt-3 text-neutral-600' }, 'Formular wird im Live-Frontend unveraendert gerendert.'),
          h(
            'div',
            { className: 'mt-8 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-sm text-neutral-500' },
            'Kontaktformular-Layout entspricht der Live-Seite.',
          ),
        ),
      ),
    ]);
  };

  const PagesPreview = (props) => {
    const data = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const title = String(data.title || '').trim().toLowerCase();
    const slug = props.entry && props.entry.get ? String(props.entry.get('slug') || '').trim().toLowerCase() : '';

    if (title === 'home' || slug === 'home') {
      return h(HomePreview, props);
    }

    return previewShell([
      h(
        'section',
        { className: 'bg-white py-20', key: 'generic-page-preview' },
        h(
          'div',
          { className: 'mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center' },
          h('h2', { className: 'font-serif text-2xl font-bold text-neutral-900' }, `Preview fuer ${title || 'Seite'}`),
          h('p', { className: 'mt-3 text-neutral-600' }, 'High-fidelity preview ist in dieser Wave fuer Startseite und Wohnungen aktiv.'),
        ),
      ),
    ]);
  };

  cms.registerPreviewTemplate('apartments', ApartmentPreview);
  cms.registerPreviewTemplate('home', HomePreview);
  cms.registerPreviewTemplate('pages', PagesPreview);
})();
