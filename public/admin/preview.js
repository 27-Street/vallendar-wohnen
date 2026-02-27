(function () {
  if (!window.CMS || !window.h) return;

  const h = window.h;

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

  const firstImageUrl = (images, getAsset) => {
    if (!Array.isArray(images) || images.length === 0) return '';
    const first = images[0];
    if (!first) return '';

    if (typeof getAsset !== 'function') return String(first);

    const asset = getAsset(first);
    if (!asset) return String(first);
    if (typeof asset === 'string') return asset;
    if (typeof asset.toString === 'function') return asset.toString();
    return String(first);
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

  const paragraphNodes = (content) => {
    if (!content) return [];
    return String(content)
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => h('p', { key: `p-${index}` }, part));
  };

  const renderFeatureCards = (features, lang) => {
    if (!Array.isArray(features)) return null;
    return h(
      'div',
      { className: 'cmsv2-feature-grid' },
      features.map((feature, index) =>
        h(
          'div',
          { className: 'cmsv2-feature-card', key: `feature-${index}` },
          h('span', { className: 'cmsv2-feature-icon' }, feature.icon || 'icon'),
          h('span', { className: 'cmsv2-feature-label' }, localized(feature.label, lang)),
        ),
      ),
    );
  };

  const renderEditorialBlocks = (blocks, lang) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return null;

    return h(
      'section',
      { className: 'cmsv2-section cmsv2-editorial' },
      h(
        'div',
        { className: 'cmsv2-editorial-stack' },
        blocks.map((block, index) => {
          if (!block || !block.type) return null;

          if (block.type === 'richText') {
            return h(
              'article',
              { className: 'cmsv2-editorial-card', key: `block-${index}` },
              paragraphNodes(localized(block.body, lang)),
            );
          }

          if (block.type === 'callout') {
            const toneClass = block.tone === 'success'
              ? 'cmsv2-callout-success'
              : block.tone === 'warning'
                ? 'cmsv2-callout-warning'
                : 'cmsv2-callout-info';

            return h(
              'article',
              { className: `cmsv2-editorial-card ${toneClass}`, key: `block-${index}` },
              h('h3', { className: 'cmsv2-editorial-title' }, localized(block.title, lang)),
              ...paragraphNodes(localized(block.body, lang)),
            );
          }

          if (block.type === 'ctaRow') {
            return h(
              'article',
              { className: 'cmsv2-editorial-card cmsv2-cta-row', key: `block-${index}` },
              h('p', { className: 'cmsv2-cta-text' }, localized(block.text, lang)),
              h('span', { className: 'cmsv2-cta-button' }, localized(block.buttonLabel, lang)),
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

    const imageUrl = firstImageUrl(data.images, getAsset);
    const amenities = Array.isArray(data.amenities) ? data.amenities : [];
    const available = !!data.available;
    const availabilityLabel = !available
      ? 'Vermietet'
      : data.availableFrom
        ? `Verfuegbar ab ${data.availableFrom}`
        : 'Verfuegbar';

    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-page' },
        h(
          'section',
          {
            className: `cmsv2-hero ${imageUrl ? 'cmsv2-hero-image' : ''}`,
            style: imageUrl ? { backgroundImage: `url(${imageUrl})` } : null,
          },
          h('div', { className: 'cmsv2-hero-overlay' }),
          h(
            'div',
            { className: 'cmsv2-hero-content' },
            h('p', { className: 'cmsv2-back-link' }, 'Zurueck zu allen Wohnungen'),
            h(
              'div',
              { className: 'cmsv2-hero-head' },
              h('h1', { className: 'cmsv2-title' }, data.name || 'Wohnungstitel'),
              h('span', { className: `cmsv2-badge ${available ? 'cmsv2-badge-live' : 'cmsv2-badge-off'}` }, availabilityLabel),
            ),
            h('p', { className: 'cmsv2-tagline' }, localized(data.tagline, lang)),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section cmsv2-main-grid' },
          h(
            'div',
            { className: 'cmsv2-main-left' },
            h('h2', { className: 'cmsv2-section-title' }, data.name || 'Wohnung'),
            ...paragraphNodes(localized(data.description, lang)),
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
              h('p', null, h('span', null, 'Miete'), h('strong', null, `${data.pricePerMonth || '-'} EUR`)),
              h('p', null, h('span', null, 'Nebenkosten'), h('strong', null, `${data.utilitiesPerMonth || '-'} EUR`)),
              h('p', { className: 'cmsv2-total' }, h('span', null, 'Gesamt'), h('strong', null, `${(Number(data.pricePerMonth) || 0) + (Number(data.utilitiesPerMonth) || 0)} EUR`)),
            ),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section' },
          h('h2', { className: 'cmsv2-section-title' }, 'Ausstattung'),
          h(
            'div',
            { className: 'cmsv2-chip-grid' },
            amenities.map((amenity, index) => h('span', { className: 'cmsv2-chip', key: `amenity-${index}` }, localized(amenity, lang))),
          ),
        ),
      ),
    );
  };

  const HomePreview = ({ entry, getAsset }) => {
    const data = toJS(entry && entry.get && entry.get('data'), {});
    const lang = 'de';
    const heroImage = resolveAssetUrl(data.hero && data.hero.images && data.hero.images.desktop, getAsset);

    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-page' },
        h(
          'section',
          {
            className: `cmsv2-hero cmsv2-home-hero ${heroImage ? 'cmsv2-hero-image' : ''}`,
            style: heroImage ? { backgroundImage: `url(${heroImage})` } : null,
          },
          h('div', { className: 'cmsv2-hero-overlay' }),
          h(
            'div',
            { className: 'cmsv2-hero-content' },
            h('h1', { className: 'cmsv2-title' }, localized(data.hero && data.hero.headline, lang) || 'Studentisches Wohnen in Vallendar'),
            h('p', { className: 'cmsv2-tagline' }, localized(data.hero && data.hero.subheadline, lang)),
            h('span', { className: 'cmsv2-hero-cta' }, localized(data.hero && data.hero.cta, lang) || 'Wohnungen entdecken'),
          ),
        ),

        h(
          'section',
          { className: 'cmsv2-section' },
          h('h2', { className: 'cmsv2-section-title' }, 'Unsere Wohnungen'),
          h('p', { className: 'cmsv2-subheadline' }, localized(data.sectionSubheadline, lang)),
        ),

        h(
          'section',
          { className: 'cmsv2-section' },
          h('h2', { className: 'cmsv2-section-title' }, 'Ihre Vorteile'),
          renderFeatureCards(data.features, lang),
        ),

        renderEditorialBlocks(data.editorialBlocks, lang),
      ),
    );
  };

  const PagesPreview = (props) => {
    const data = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const title = data.title;

    if (title === 'home') {
      return h(HomePreview, props);
    }

    return h(
      'div',
      { className: 'cmsv2-shell' },
      h(
        'article',
        { className: 'cmsv2-page cmsv2-generic' },
        h('h1', { className: 'cmsv2-section-title' }, `Preview for ${title || 'page'}`),
        h('p', null, 'Detailed visual preview is implemented for the homepage in this CMS wave.'),
      ),
    );
  };

  window.CMS.registerPreviewStyle('/admin/preview.css');
  window.CMS.registerPreviewTemplate('apartments', ApartmentPreview);
  window.CMS.registerPreviewTemplate('pages', PagesPreview);
})();
