(function () {
  if (!window.CMS) return;

  const h = window.h || (window.React && window.React.createElement);
  if (!h) {
    // Avoid silent fallback to Decap's generic preview when globals are not ready.
    console.error('[cms-preview] Could not resolve element factory (window.h).');
    return;
  }

  const HOME_PREVIEW_CARDS = [
    { name: 'Alte Muehle', size: '38 m2', rooms: '1.5 Zimmer', price: 'ab 580 EUR/Monat' },
    { name: 'Rheinblick', size: '47 m2', rooms: '2 Zimmer', price: 'ab 620 EUR/Monat' },
    { name: 'Zur Linde', size: '52 m2', rooms: '2 Zimmer', price: 'ab 680 EUR/Monat' },
  ];

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

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatDateDe = (value) => {
    if (!value || typeof value !== 'string') return '';
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return value;
    return `${match[3]}.${match[2]}.${match[1]}`;
  };

  const formatAvailability = (available, availableFrom) => {
    if (!available) return 'Vermietet';
    if (!availableFrom) return 'Verfuegbar';
    return `Verfuegbar ab ${formatDateDe(availableFrom)}`;
  };

  const resolveAssetUrl = (value, getAsset) => {
    if (!value) return '';
    if (typeof getAsset !== 'function') return String(value);
    const asset = getAsset(value);
    if (!asset) return String(value);
    if (typeof asset === 'string') return asset;
    if (typeof asset.toString === 'function') return asset.toString();
    return String(value);
  };

  const normalizeImageEntries = (images) => {
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

  const selectPrimaryImage = (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return null;
    return entries.find((entry) => entry.isPrimary) || entries[0];
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const sanitizeHref = (href) => {
    if (!href) return '#';
    const trimmed = String(href).trim();
    if (/^(https?:\/\/|\/|#)/i.test(trimmed)) return trimmed;
    return '#';
  };

  const renderInlineMarkdown = (line) => {
    let output = escapeHtml(line);
    output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
    output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const safeHref = sanitizeHref(href);
      const rel = safeHref.startsWith('http') ? ' rel="noopener noreferrer"' : '';
      const target = safeHref.startsWith('http') ? ' target="_blank"' : '';
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
    let index = 0;

    const isBlockBoundary = (line) => (
      /^#{1,6}\s+/.test(line)
      || /^\s*[-*+]\s+/.test(line)
      || /^\s*\d+\.\s+/.test(line)
      || /^\s*>\s?/.test(line)
    );

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, '').trim());
          index += 1;
        }
        html.push(`<blockquote>${renderInlineMarkdown(quoteLines.join(' '))}</blockquote>`);
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*[-*+]\s+/, '').trim());
          index += 1;
        }
        html.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
          items.push(lines[index].replace(/^\s*\d+\.\s+/, '').trim());
          index += 1;
        }
        html.push(`<ol>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')}</ol>`);
        continue;
      }

      const paragraphLines = [];
      while (index < lines.length && lines[index].trim() && !isBlockBoundary(lines[index])) {
        paragraphLines.push(lines[index].trim());
        index += 1;
      }
      html.push(`<p>${paragraphLines.map(renderInlineMarkdown).join('<br />')}</p>`);
    }

    return html.join('');
  };

  const markdownNode = (value, className) => h('div', {
    className,
    dangerouslySetInnerHTML: {
      __html: markdownToHtml(value),
    },
  });

  const renderApartmentGallery = (images, getAsset, apartmentName, lang) => {
    const normalized = normalizeImageEntries(images);
    if (normalized.length === 0) {
      return h(
        'div',
        { className: 'cmsv2-gallery-empty' },
        h('span', null, `${apartmentName || 'Wohnung'} - Keine Bilder hinterlegt`),
      );
    }

    const sorted = [...normalized].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)));
    const primary = sorted[0];
    const secondary = sorted.slice(1, 5);
    const primaryUrl = resolveAssetUrl(primary.image, getAsset);
    const primaryAlt = localized(primary.caption, lang) || apartmentName || 'Wohnung';

    return h(
      'div',
      { className: 'cmsv2-gallery-grid' },
      h(
        'div',
        { className: 'cmsv2-gallery-primary' },
        h('img', { src: primaryUrl, alt: primaryAlt }),
      ),
      h(
        'div',
        { className: 'cmsv2-gallery-secondary' },
        secondary.map((entry, index) => {
          const alt = localized(entry.caption, lang) || `${apartmentName || 'Wohnung'} - Bild ${index + 2}`;
          return h(
            'div',
            { className: 'cmsv2-gallery-thumb', key: `gallery-${index}` },
            h('img', { src: resolveAssetUrl(entry.image, getAsset), alt }),
          );
        }),
      ),
    );
  };

  const renderFeatureCards = (features, lang) => {
    if (!Array.isArray(features) || features.length === 0) return null;
    return h(
      'div',
      { className: 'cmsv2-feature-grid' },
      features.map((feature, index) => {
        const iconLabel = String(feature.icon || 'ic').slice(0, 2).toUpperCase();
        return h(
          'div',
          { className: 'cmsv2-feature-card', key: `feature-${index}` },
          h('span', { className: 'cmsv2-feature-icon', 'aria-hidden': 'true' }, iconLabel),
          h('span', { className: 'cmsv2-feature-label' }, localized(feature.label, lang)),
        );
      }),
    );
  };

  const renderEditorialBlocks = (blocks, lang) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;

    return h(
      'section',
      { className: 'cmsv2-section cmsv2-section-white' },
      h(
        'div',
        { className: 'cmsv2-container cmsv2-editorial-stack' },
        blocks.map((block, index) => {
          if (!block || !block.type) return null;

          if (block.type === 'richText') {
            return h(
              'article',
              { className: 'cmsv2-editorial-block cmsv2-editorial-info', key: `block-${index}` },
              markdownNode(localized(block.body, lang), 'cmsv2-richtext'),
            );
          }

          if (block.type === 'callout') {
            const toneClass = block.tone === 'success'
              ? 'cmsv2-editorial-success'
              : block.tone === 'warning'
                ? 'cmsv2-editorial-warning'
                : 'cmsv2-editorial-info';

            return h(
              'article',
              { className: `cmsv2-editorial-block ${toneClass}`, key: `block-${index}` },
              h('h3', { className: 'cmsv2-editorial-title' }, localized(block.title, lang)),
              markdownNode(localized(block.body, lang), 'cmsv2-richtext'),
            );
          }

          if (block.type === 'ctaRow') {
            return h(
              'article',
              { className: 'cmsv2-editorial-block cmsv2-editorial-info cmsv2-cta-row', key: `block-${index}` },
              h('p', { className: 'cmsv2-cta-text' }, localized(block.text, lang)),
              h('span', { className: 'cmsv2-cta-button' }, localized(block.buttonLabel, lang) || 'Mehr erfahren'),
            );
          }

          return null;
        }),
      ),
    );
  };

  const ApartmentPreview = ({ entry, getAsset }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const lang = 'de';
    const images = normalizeImageEntries(data.images);
    const primaryImage = selectPrimaryImage(images);
    const heroImage = primaryImage ? resolveAssetUrl(primaryImage.image, getAsset) : '';
    const amenities = Array.isArray(data.amenities) ? data.amenities : [];
    const available = !!data.available;
    const pricePerMonth = toNumber(data.pricePerMonth);
    const utilitiesPerMonth = toNumber(data.utilitiesPerMonth);
    const total = pricePerMonth + utilitiesPerMonth;

    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-site' },
        h(
          'section',
          {
            className: `cmsv2-hero cmsv2-apartment-hero ${heroImage ? 'cmsv2-hero-image' : ''}`,
            style: heroImage ? { backgroundImage: `url(${heroImage})` } : null,
          },
          h('div', { className: 'cmsv2-hero-overlay' }),
          h(
            'div',
            { className: 'cmsv2-container cmsv2-hero-content' },
            h('p', { className: 'cmsv2-back-link' }, 'Zurueck zu allen Wohnungen'),
            h(
              'div',
              { className: 'cmsv2-hero-head' },
              h('h1', { className: 'cmsv2-title' }, data.name || 'Wohnungstitel'),
              h(
                'span',
                { className: `cmsv2-badge ${available ? 'cmsv2-badge-live' : 'cmsv2-badge-off'}` },
                formatAvailability(available, data.availableFrom),
              ),
            ),
            h('p', { className: 'cmsv2-tagline' }, localized(data.tagline, lang)),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-soft' },
          h(
            'div',
            { className: 'cmsv2-container' },
            renderApartmentGallery(images, getAsset, data.name, lang),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-white' },
          h(
            'div',
            { className: 'cmsv2-container cmsv2-main-grid' },
            h(
              'div',
              { className: 'cmsv2-main-left' },
              h('h2', { className: 'cmsv2-section-title' }, data.name || 'Wohnung'),
              markdownNode(localized(data.description, lang), 'cmsv2-richtext'),
              h(
                'div',
                { className: 'cmsv2-stat-grid' },
                h('div', { className: 'cmsv2-stat' }, h('span', null, 'Groesse'), h('strong', null, `${data.size || '-'} m2`)),
                h('div', { className: 'cmsv2-stat' }, h('span', null, 'Zimmer'), h('strong', null, localized(data.rooms, lang) || '-')),
                h('div', { className: 'cmsv2-stat' }, h('span', null, 'Stockwerk'), h('strong', null, localized(data.floor, lang) || '-')),
                h('div', { className: 'cmsv2-stat' }, h('span', null, 'Max. Bewohner'), h('strong', null, String(data.maxOccupants || '-'))),
              ),
            ),
            h(
              'aside',
              { className: 'cmsv2-main-right' },
              h('h3', { className: 'cmsv2-card-title' }, 'Mietkosten'),
              h(
                'div',
                { className: 'cmsv2-price-lines' },
                h('p', null, h('span', null, 'Miete'), h('strong', null, `${pricePerMonth || '-'} EUR`)),
                h('p', null, h('span', null, 'Nebenkosten'), h('strong', null, `${utilitiesPerMonth || '-'} EUR`)),
                h('p', { className: 'cmsv2-total' }, h('span', null, 'Gesamt'), h('strong', null, `${total || '-'} EUR`)),
              ),
              h('div', { className: 'cmsv2-side-badge' }, formatAvailability(available, data.availableFrom)),
            ),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-soft' },
          h(
            'div',
            { className: 'cmsv2-container' },
            h('h2', { className: 'cmsv2-section-title' }, 'Ausstattung'),
            h(
              'div',
              { className: 'cmsv2-chip-grid' },
              amenities.map((amenity, index) => (
                h('span', { className: 'cmsv2-chip', key: `amenity-${index}` }, localized(amenity, lang))
              )),
            ),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-white' },
          h(
            'div',
            { className: 'cmsv2-container cmsv2-inquiry' },
            h('h2', { className: 'cmsv2-section-title cmsv2-section-title-sm' }, 'Anfrage senden'),
            h('p', null, 'Formularbereich im Live-Frontend vorhanden.'),
          ),
        ),
      ),
    );
  };

  const HomePreview = ({ entry, getAsset }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const lang = 'de';
    const heroImage = resolveAssetUrl(
      data.hero && data.hero.images && data.hero.images.desktop,
      getAsset,
    );

    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-site' },
        h(
          'section',
          {
            className: `cmsv2-hero cmsv2-home-hero ${heroImage ? 'cmsv2-hero-image' : ''}`,
            style: heroImage ? { backgroundImage: `url(${heroImage})` } : null,
          },
          h('div', { className: 'cmsv2-hero-overlay' }),
          h(
            'div',
            { className: 'cmsv2-container cmsv2-home-hero-content' },
            h(
              'h1',
              { className: 'cmsv2-title cmsv2-home-title' },
              localized(data.hero && data.hero.headline, lang) || 'Studentisches Wohnen in Vallendar',
            ),
            h('p', { className: 'cmsv2-tagline cmsv2-home-tagline' }, localized(data.hero && data.hero.subheadline, lang)),
            h('span', { className: 'cmsv2-hero-cta' }, localized(data.hero && data.hero.cta, lang) || 'Wohnungen entdecken'),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-soft' },
          h(
            'div',
            { className: 'cmsv2-container' },
            h('h2', { className: 'cmsv2-section-title cmsv2-centered' }, 'Unsere Wohnungen'),
            markdownNode(localized(data.sectionSubheadline, lang), 'cmsv2-richtext cmsv2-subheadline cmsv2-centered'),
            h(
              'div',
              { className: 'cmsv2-apartment-grid' },
              HOME_PREVIEW_CARDS.map((card, index) => h(
                'article',
                { className: 'cmsv2-apartment-card', key: `home-card-${index}` },
                h(
                  'div',
                  { className: 'cmsv2-apartment-thumb' },
                  h('span', null, 'Bildvorschau'),
                ),
                h('h3', null, card.name),
                h('p', { className: 'cmsv2-apartment-meta' }, `${card.size} - ${card.rooms}`),
                h('p', { className: 'cmsv2-apartment-price' }, card.price),
              )),
            ),
          ),
        ),

        renderEditorialBlocks(data.editorialBlocks, lang),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-section-white' },
          h(
            'div',
            { className: 'cmsv2-container' },
            h('h2', { className: 'cmsv2-section-title cmsv2-centered' }, 'Ihre Vorteile'),
            renderFeatureCards(data.features, lang),
          ),
        ),
      ),
    );
  };

  const GenericPagePreview = ({ entry }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const title = data.title || 'page';
    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-site cmsv2-generic' },
        h('h1', { className: 'cmsv2-section-title' }, `Preview: ${title}`),
        h('p', null, 'Live-like preview is fully implemented for "home" and apartment entries.'),
      ),
    );
  };

  const PagesPreview = (props) => {
    const data = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const title = String(data.title || '').trim().toLowerCase();
    const slug = props.entry && props.entry.get ? String(props.entry.get('slug') || '').trim().toLowerCase() : '';
    if (title === 'home' || slug === 'home') return h(HomePreview, props);
    return h(GenericPagePreview, props);
  };

  window.CMS.registerPreviewStyle('/admin/preview.css');
  window.CMS.registerPreviewTemplate('apartments', ApartmentPreview);
  // File collections need template registration by file "name".
  window.CMS.registerPreviewTemplate('home', HomePreview);
  window.CMS.registerPreviewTemplate('pages', PagesPreview);
})();
