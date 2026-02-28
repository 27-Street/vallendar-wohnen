(function () {
  const PROTOCOL_VERSION = 1;
  const MESSAGE_TYPES = {
    READY: 'CMS_PREVIEW_READY',
    UPDATE: 'CMS_PREVIEW_UPDATE',
    SET_LOCALE: 'CMS_PREVIEW_SET_LOCALE',
    REQUEST_FOCUS: 'CMS_PREVIEW_REQUEST_FOCUS',
    ACK: 'CMS_PREVIEW_ACK',
  };

  const RICH_TEXT_CONFIG_SIGNATURE = 'cms-richtext-v1-2026-02-28';

  const bootstrap = window.__CMS_PREVIEW_BOOTSTRAP__ || {};
  const page = bootstrap.page === 'apartments' ? 'apartments' : 'home';
  const fieldMap = bootstrap.fieldMap || {};
  const richTextConfig = bootstrap.richTextConfig || {};

  const state = {
    locale: bootstrap.locale === 'en' ? 'en' : 'de',
    payload: bootstrap.initialPayload || null,
    highlight: false,
    activePath: '',
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const toArray = (value) => (Array.isArray(value) ? value : []);

  const getLocalized = (value, locale) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      if (typeof value[locale] === 'string') return value[locale];
      if (typeof value.de === 'string') return value.de;
      if (typeof value.en === 'string') return value.en;
    }
    return '';
  };

  const resolveAsset = (path) => {
    if (!path || typeof path !== 'string') return '';
    const map = state.payload && state.payload.resolvedAssets ? state.payload.resolvedAssets : {};
    return map[path] || path;
  };

  const renderMarkdown = (markdown) => {
    const input = String(markdown || '').trim();
    if (!input) return '';

    if (window.marked && typeof window.marked.parse === 'function') {
      const parsed = window.marked.parse(input, {
        gfm: true,
        breaks: true,
      });

      if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        return window.DOMPurify.sanitize(parsed, {
          ALLOWED_TAGS: richTextConfig.allowedTags,
          ALLOWED_ATTR: richTextConfig.allowedAttributes,
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/|#)/i,
        });
      }

      return parsed;
    }

    return `<p>${escapeHtml(input).replace(/\n/g, '<br />')}</p>`;
  };

  const query = (selector) => {
    if (!selector) return null;
    return document.querySelector(selector);
  };

  const queryPath = (path) => {
    const selector = fieldMap[path];
    if (selector) {
      return query(selector);
    }
    return query(`[data-cms-path="${path}"]`);
  };

  const setText = (path, value) => {
    const node = queryPath(path);
    if (!node) return;
    node.textContent = value == null ? '' : String(value);
  };

  const setHTML = (path, html) => {
    const node = queryPath(path);
    if (!node) return;
    node.innerHTML = html;
  };

  const setAttr = (path, attribute, value) => {
    const node = queryPath(path);
    if (!node) return;
    if (!value) {
      node.removeAttribute(attribute);
      return;
    }
    node.setAttribute(attribute, String(value));
  };

  const formatDate = (value, locale) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(parsed);
  };

  const resolveAvailability = (available, availableFrom, locale) => {
    const isAvailable = Boolean(available);
    if (!isAvailable) {
      return locale === 'de' ? 'Vermietet' : 'Occupied';
    }

    if (availableFrom) {
      const formatted = formatDate(availableFrom, locale);
      return locale === 'de'
        ? `Verfuegbar ab ${formatted}`
        : `Available from ${formatted}`;
    }

    return locale === 'de' ? 'Verfuegbar' : 'Available';
  };

  const sanitizeHref = (href) => {
    const raw = String(href || '').trim();
    if (!raw) return '#';
    if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(raw)) return raw;
    return '#';
  };

  const renderHomeFeatures = (features, locale) => {
    const items = toArray(features);
    if (items.length === 0) return '';

    return items.map((feature) => {
      const iconLabel = escapeHtml(String(feature.icon || 'ic').slice(0, 2).toUpperCase());
      return `
        <div class="flex min-h-[12.875rem] flex-col items-center justify-center rounded-3xl bg-white p-[1.3125rem] text-center ring-1 ring-neutral-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg sm:p-[2.125rem]">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-900">
            <span class="text-[0.625rem] font-semibold uppercase tracking-[0.12em]">${iconLabel}</span>
          </span>
          <span class="mt-[1.3125rem] text-base font-semibold text-neutral-800">${escapeHtml(getLocalized(feature.label, locale))}</span>
        </div>
      `;
    }).join('');
  };

  const renderEditorialBlocks = (blocks, locale) => {
    const items = toArray(blocks);
    if (items.length === 0) {
      return '<div class="rounded-2xl border border-dashed border-neutral-300 p-6 text-sm text-neutral-500">No editorial blocks configured.</div>';
    }

    return items.map((block) => {
      if (block.type === 'richText') {
        return `
          <div class="editorial-block editorial-block-info">
            <div class="richtext">${renderMarkdown(getLocalized(block.body, locale))}</div>
          </div>
        `;
      }

      if (block.type === 'callout') {
        const toneClass = block.tone === 'success'
          ? 'editorial-block-success'
          : block.tone === 'warning'
            ? 'editorial-block-warning'
            : 'editorial-block-info';

        return `
          <div class="editorial-block ${toneClass}">
            <h3 class="font-serif text-xl font-bold text-neutral-900">${escapeHtml(getLocalized(block.title, locale))}</h3>
            <div class="richtext mt-3">${renderMarkdown(getLocalized(block.body, locale))}</div>
          </div>
        `;
      }

      if (block.type === 'ctaRow') {
        return `
          <div class="editorial-block editorial-block-info flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm font-medium text-neutral-800">${escapeHtml(getLocalized(block.text, locale))}</p>
            <a href="${escapeHtml(sanitizeHref(getLocalized(block.buttonHref, locale)))}" class="btn btn-primary">
              ${escapeHtml(getLocalized(block.buttonLabel, locale))}
              <span aria-hidden="true">→</span>
            </a>
          </div>
        `;
      }

      return '';
    }).join('');
  };

  const renderApartmentAmenities = (amenities, locale) => {
    const items = toArray(amenities);
    if (items.length === 0) {
      return '<div class="rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-500">No amenities configured.</div>';
    }

    return items.map((amenity) => `
      <div class="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-neutral-200 transition-all duration-200 hover:shadow-sm hover:ring-accent-200">
        <span class="h-5 w-5 shrink-0 text-accent-600">✓</span>
        <span class="min-w-0 break-words text-sm font-medium text-neutral-800">${escapeHtml(getLocalized(amenity, locale))}</span>
      </div>
    `).join('');
  };

  const normalizeImages = (images) => toArray(images)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      if (!entry.image) return null;
      return {
        image: String(entry.image),
        kind: String(entry.kind || 'other'),
        caption: entry.caption || null,
        isPrimary: Boolean(entry.isPrimary),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const renderApartmentImages = (images, apartmentName, locale) => {
    const items = normalizeImages(images);
    if (items.length === 0) {
      return '<div class="rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 p-8 text-sm text-neutral-500">No apartment images configured.</div>';
    }

    return items.slice(0, 5).map((entry, index) => {
      const src = resolveAsset(entry.image);
      const caption = getLocalized(entry.caption, locale);
      const alt = caption ? `${apartmentName} — ${caption}` : `${apartmentName} — ${index + 1}`;
      const className = index === 0
        ? 'group relative overflow-hidden rounded-xl sm:col-span-2 lg:row-span-2 aspect-[16/10] sm:aspect-[16/10] lg:aspect-auto lg:h-full'
        : 'group relative overflow-hidden rounded-xl aspect-[4/3]';

      return `
        <div class="${className}">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          <div class="absolute inset-0 bg-accent-950/0 transition-colors duration-200 group-hover:bg-accent-950/10"></div>
        </div>
      `;
    }).join('');
  };

  const applyHighlights = () => {
    document.querySelectorAll('[data-cms-path]').forEach((node) => {
      node.classList.toggle('cms-preview-highlightable', state.highlight);
      node.classList.remove('cms-preview-highlight-active');
    });

    if (!state.highlight || !state.activePath) return;

    const direct = document.querySelector(`[data-cms-path="${state.activePath}"]`);
    if (direct) {
      direct.classList.add('cms-preview-highlight-active');
      direct.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const renderHome = () => {
    const payload = state.payload || {};
    const data = payload.data || {};
    const locale = state.locale;

    setText('hero.headline', getLocalized(data.hero && data.hero.headline, locale));
    setText('hero.subheadline', getLocalized(data.hero && data.hero.subheadline, locale));
    setText('hero.cta', getLocalized(data.hero && data.hero.cta, locale));

    const heroImages = data.hero && data.hero.images ? data.hero.images : {};
    const desktopPath = heroImages.desktop || '';
    const tabletPath = heroImages.tablet || '';
    const mobilePath = heroImages.mobile || '';

    setAttr('hero.images.desktop', 'src', resolveAsset(desktopPath));
    setAttr('hero.images.tablet', 'srcset', resolveAsset(tabletPath));
    setAttr('hero.images.mobile', 'srcset', resolveAsset(mobilePath));

    setText('welcomeSpotlight.eyebrow', getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.eyebrow, locale));
    setText('welcomeSpotlight.headline', getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.headline, locale));
    setText('welcomeSpotlight.body', getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.body, locale));
    setText('welcomeSpotlight.ctaLabel', getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.ctaLabel, locale));
    setAttr('welcomeSpotlight.ctaHref', 'href', sanitizeHref(getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.ctaHref, locale)));

    const spotlightImagePath = data.welcomeSpotlight && data.welcomeSpotlight.image
      ? data.welcomeSpotlight.image
      : '';
    const spotlightAlt = getLocalized(data.welcomeSpotlight && data.welcomeSpotlight.imageAlt, locale);

    setAttr('welcomeSpotlight.image', 'src', resolveAsset(spotlightImagePath));
    setAttr('welcomeSpotlight.image', 'alt', spotlightAlt || '');

    setHTML('sectionSubheadline', renderMarkdown(getLocalized(data.sectionSubheadline, locale)));
    setHTML('features', renderHomeFeatures(data.features, locale));
    setHTML('editorialBlocks', renderEditorialBlocks(data.editorialBlocks, locale));

    setText('seo.title', getLocalized(data.seo && data.seo.title, locale));
    setText('seo.description', getLocalized(data.seo && data.seo.description, locale));

    const seoImagePath = data.seo && data.seo.ogImage ? data.seo.ogImage : '';
    setAttr('seo.ogImage', 'src', resolveAsset(seoImagePath));

    applyHighlights();
  };

  const renderApartment = () => {
    const payload = state.payload || {};
    const data = payload.data || {};
    const locale = state.locale;

    const name = data.name || '';
    const rent = Number(data.pricePerMonth || 0);
    const utilities = Number(data.utilitiesPerMonth || 0);
    const total = rent + utilities;

    setText('name', name);
    setText('nameSecondary', name);
    setText('tagline', getLocalized(data.tagline, locale));
    setHTML('description', renderMarkdown(getLocalized(data.description, locale)));
    setText('size', `${data.size || '-'} m²`);
    setText('rooms', getLocalized(data.rooms, locale));
    setText('floor', getLocalized(data.floor, locale));
    setText('maxOccupants', String(data.maxOccupants || '-'));

    const priceFormat = locale === 'de'
      ? `${rent} €`
      : `€${rent}`;
    const utilitiesFormat = locale === 'de'
      ? `${utilities} €`
      : `€${utilities}`;
    const totalFormat = locale === 'de'
      ? `${total} € / Monat`
      : `€${total} / month`;

    setText('pricePerMonth', priceFormat);
    setText('utilitiesPerMonth', utilitiesFormat);
    setText('totalRent', totalFormat);

    const availableLabel = resolveAvailability(data.available, data.availableFrom, locale);
    setText('available', availableLabel);
    setText('availableFrom', data.availableFrom ? formatDate(data.availableFrom, locale) : '');

    setHTML('amenities', renderApartmentAmenities(data.amenities, locale));
    setHTML('images', renderApartmentImages(data.images, name, locale));

    setText('seo.title', getLocalized(data.seo && data.seo.title, locale));
    setText('seo.description', getLocalized(data.seo && data.seo.description, locale));
    setAttr('seo.ogImage', 'src', resolveAsset(data.seo && data.seo.ogImage));

    applyHighlights();
  };

  const renderPreview = () => {
    if (!state.payload) return;
    if (page === 'apartments') {
      renderApartment();
    } else {
      renderHome();
    }

    (window.top || window.parent).postMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.ACK,
      status: 'synced',
      message: '',
      signature: RICH_TEXT_CONFIG_SIGNATURE,
    }, window.location.origin);
  };

  const applyPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return;
    state.payload = payload;
    state.locale = payload.locale === 'en' ? 'en' : 'de';
    state.highlight = Boolean(payload.highlight);
    state.activePath = typeof payload.activePath === 'string' ? payload.activePath : '';
    renderPreview();
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.version !== PROTOCOL_VERSION) return;

    if (data.type === MESSAGE_TYPES.UPDATE) {
      applyPayload(data.payload);
      return;
    }

    if (data.type === MESSAGE_TYPES.SET_LOCALE) {
      state.locale = data.locale === 'en' ? 'en' : 'de';
      renderPreview();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pathNode = target.closest('[data-cms-path]');
    if (!pathNode) return;

    const path = pathNode.getAttribute('data-cms-path');
    if (!path) return;

    (window.top || window.parent).postMessage({
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.REQUEST_FOCUS,
      path,
    }, window.location.origin);
  });

  if (bootstrap.initialPayload) {
    renderPreview();
  }

  (window.top || window.parent).postMessage({
    version: PROTOCOL_VERSION,
    type: MESSAGE_TYPES.READY,
    signature: RICH_TEXT_CONFIG_SIGNATURE,
  }, window.location.origin);
})();
