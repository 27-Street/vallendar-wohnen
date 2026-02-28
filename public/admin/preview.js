(function () {
  const cms = window.CMS || window.DecapCms || window.DecapCmsApp;
  const h = window.h;

  if (!cms || typeof h !== 'function') {
    return;
  }

  const PROTOCOL_VERSION = 1;
  const MESSAGE_TYPES = {
    READY: 'CMS_PREVIEW_READY',
    UPDATE: 'CMS_PREVIEW_UPDATE',
    SET_LOCALE: 'CMS_PREVIEW_SET_LOCALE',
    REQUEST_FOCUS: 'CMS_PREVIEW_REQUEST_FOCUS',
    ACK: 'CMS_PREVIEW_ACK',
  };

  const stores = new Map();
  let activeStoreKey = null;
  let listenersBound = false;

  cms.registerPreviewStyle('/admin/preview.css');

  const toJS = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value.toJS === 'function') return value.toJS();
    return value;
  };

  const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

  const looksLikeMediaPath = (value, keyTrail) => {
    if (typeof value !== 'string') return false;

    const normalizedValue = value.trim();
    if (!normalizedValue) return false;
    if (/^https?:\/\//i.test(normalizedValue)) return false;

    const lowerValue = normalizedValue.toLowerCase();
    if (lowerValue.startsWith('/images/')) return true;

    const lowerTrail = keyTrail.join('.').toLowerCase();
    const containsImageKey = /(^|\.)(image|images|ogimage|heroimage)(\.|$)/i.test(lowerTrail);
    const hasImageExtension = /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(lowerValue);
    return containsImageKey && hasImageExtension;
  };

  const collectMediaPaths = (node, keyTrail, output) => {
    if (typeof node === 'string') {
      if (looksLikeMediaPath(node, keyTrail)) {
        output.add(node);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => collectMediaPaths(item, [...keyTrail, String(index)], output));
      return;
    }

    if (!isObject(node)) return;

    Object.entries(node).forEach(([key, value]) => {
      collectMediaPaths(value, [...keyTrail, key], output);
    });
  };

  const resolveAssetUrl = (value, getAsset) => {
    if (typeof getAsset !== 'function') return value;

    try {
      const asset = getAsset(value);
      if (!asset) return value;
      if (typeof asset === 'string') return asset;
      if (typeof asset.toString === 'function') {
        const asString = asset.toString();
        if (asString && asString !== '[object Object]') return asString;
      }
      if (typeof asset.url === 'string') return asset.url;
      return value;
    } catch {
      return value;
    }
  };

  const buildResolvedAssets = (entryData, getAsset) => {
    const paths = new Set();
    collectMediaPaths(entryData, [], paths);

    const resolved = {};
    paths.forEach((path) => {
      resolved[path] = resolveAssetUrl(path, getAsset);
    });

    return resolved;
  };

  const hasBlobAsset = (resolvedAssets) => Object.values(resolvedAssets).some((value) => (
    typeof value === 'string' && value.startsWith('blob:')
  ));

  const normalizePathToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

  const findBestInputMatch = (path) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select, [contenteditable="true"]'));
    if (inputs.length === 0) return null;

    const normalizedPath = normalizePathToken(path);
    const pathTail = normalizePathToken(String(path).split('.').slice(-1)[0]);

    let best = null;
    let bestScore = 0;

    inputs.forEach((input) => {
      const name = normalizePathToken(input.getAttribute('name') || '');
      const id = normalizePathToken(input.getAttribute('id') || '');
      const label = normalizePathToken(input.getAttribute('aria-label') || '');
      const haystack = `${name} ${id} ${label}`.trim();
      if (!haystack) return;

      let score = 0;
      if (normalizedPath && haystack.includes(normalizedPath)) score += 4;
      if (pathTail && haystack.includes(pathTail)) score += 2;
      if (pathTail && (name.endsWith(pathTail) || id.endsWith(pathTail))) score += 3;

      if (score > bestScore) {
        best = input;
        bestScore = score;
      }
    });

    return bestScore > 0 ? best : null;
  };

  const isHomeEntry = (entryData, slug) => {
    if (slug === 'home') return true;
    const title = typeof entryData?.title === 'string' ? entryData.title.trim().toLowerCase() : '';
    return title === 'home';
  };

  const createStore = (key, mode) => ({
    key,
    mode,
    locale: 'de',
    viewport: 'desktop',
    highlight: false,
    activePath: '',
    ready: false,
    handshakeTimeout: false,
    status: 'loading',
    statusNote: '',
    rootId: `cms-preview-root-${key}`,
    iframeId: `cms-preview-iframe-${key}`,
    frameShellId: `cms-preview-shell-${key}`,
    statusId: `cms-preview-status-${key}`,
    noteId: `cms-preview-note-${key}`,
    fallbackId: `cms-preview-fallback-${key}`,
    fallbackJsonId: `cms-preview-fallback-json-${key}`,
    localeGroupId: `cms-preview-locale-${key}`,
    viewportGroupId: `cms-preview-viewport-${key}`,
    highlightButtonId: `cms-preview-highlight-${key}`,
    latestPayload: null,
    source: mode === 'apartments' ? '/cms-preview/apartment?cmsPreview=1' : '/cms-preview/home?cmsPreview=1',
    updateTimer: null,
    handshakeTimer: null,
  });

  const getPreviewPaneDocument = () => {
    const previewPane = document.getElementById('preview-pane');
    if (previewPane && previewPane.tagName === 'IFRAME' && previewPane.contentDocument) {
      return previewPane.contentDocument;
    }
    return document;
  };

  const ensureStore = (key, mode) => {
    if (!stores.has(key)) {
      stores.set(key, createStore(key, mode));
    }
    return stores.get(key);
  };

  const setStatus = (store, status, note) => {
    store.status = status;
    store.statusNote = note || '';

    const statusEl = getPreviewPaneDocument().getElementById(store.statusId);
    if (statusEl) {
      statusEl.className = ['cms-preview-status', `status-${status.replace(/\s+/g, '-')}`].join(' ');
      statusEl.textContent = status;
    }

    const noteEl = getPreviewPaneDocument().getElementById(store.noteId);
    if (noteEl) {
      noteEl.textContent = store.statusNote;
      noteEl.style.display = store.statusNote ? 'block' : 'none';
    }
  };

  const setFallbackVisible = (store, visible) => {
    const fallbackEl = getPreviewPaneDocument().getElementById(store.fallbackId);
    if (!fallbackEl) return;
    fallbackEl.style.display = visible ? 'block' : 'none';
  };

  const updateFallbackJson = (store) => {
    const jsonEl = getPreviewPaneDocument().getElementById(store.fallbackJsonId);
    if (!jsonEl) return;
    const data = store.latestPayload ? store.latestPayload.payload.data : {};
    jsonEl.textContent = JSON.stringify(data, null, 2);
  };

  const applyViewport = (store) => {
    const shell = getPreviewPaneDocument().getElementById(store.frameShellId);
    if (!shell) return;

    const widths = {
      desktop: '100%',
      tablet: '860px',
      mobile: '430px',
    };

    shell.style.width = widths[store.viewport] || widths.desktop;

    const group = getPreviewPaneDocument().getElementById(store.viewportGroupId);
    if (!group) return;
    group.querySelectorAll('.cms-preview-toolbar-button[data-cms-value]').forEach((button) => {
      const isActive = button.getAttribute('data-cms-value') === store.viewport;
      button.classList.toggle('is-active', isActive);
    });
  };

  const applyLocaleButtons = (store) => {
    const group = getPreviewPaneDocument().getElementById(store.localeGroupId);
    if (!group) return;

    group.querySelectorAll('.cms-preview-toolbar-button[data-cms-value]').forEach((button) => {
      const isActive = button.getAttribute('data-cms-value') === store.locale;
      button.classList.toggle('is-active', isActive);
    });
  };

  const applyHighlightButton = (store) => {
    const button = getPreviewPaneDocument().getElementById(store.highlightButtonId);
    if (!button) return;
    button.classList.toggle('is-active', store.highlight);
    button.textContent = store.highlight ? 'Highlight: On' : 'Highlight: Off';
  };

  const postToIframe = (store, message) => {
    const iframe = getPreviewPaneDocument().getElementById(store.iframeId);
    if (!iframe || !iframe.contentWindow) return false;

    iframe.contentWindow.postMessage(message, window.location.origin);
    return true;
  };

  const flushUpdate = (store) => {
    if (!store.ready || !store.latestPayload) return;

    const sent = postToIframe(store, store.latestPayload);
    if (sent) {
      if (store.status !== 'asset pending') {
        setStatus(store, 'updating', store.statusNote);
      }
    }
  };

  const queueUpdate = (store, immediate) => {
    if (!store.latestPayload) return;

    if (!store.ready) {
      setStatus(store, 'loading', store.statusNote);
      return;
    }

    if (store.updateTimer) {
      window.clearTimeout(store.updateTimer);
      store.updateTimer = null;
    }

    if (immediate) {
      flushUpdate(store);
      return;
    }

    store.updateTimer = window.setTimeout(() => {
      flushUpdate(store);
    }, 120);
  };

  const setLocale = (store, locale) => {
    if (store.locale === locale) return;
    store.locale = locale;
    applyLocaleButtons(store);

    postToIframe(store, {
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.SET_LOCALE,
      locale,
    });

    if (store.latestPayload) {
      store.latestPayload.payload.locale = locale;
    }

    setStatus(store, 'updating', `Locale switched to ${locale.toUpperCase()}.`);
    queueUpdate(store, true);
  };

  const setViewport = (store, viewport) => {
    if (store.viewport === viewport) return;
    store.viewport = viewport;
    applyViewport(store);
  };

  const toggleHighlight = (store) => {
    store.highlight = !store.highlight;
    applyHighlightButton(store);

    if (store.latestPayload) {
      store.latestPayload.payload.highlight = store.highlight;
      store.latestPayload.payload.activePath = store.activePath || null;
    }

    queueUpdate(store, false);
  };

  const bindStoreDom = (store) => {
    applyLocaleButtons(store);
    applyViewport(store);
    applyHighlightButton(store);
    updateFallbackJson(store);

    const iframe = getPreviewPaneDocument().getElementById(store.iframeId);
    if (iframe && iframe.getAttribute('src') !== store.source) {
      store.ready = false;
      iframe.setAttribute('src', store.source);
    }

    if (!store.ready && !store.handshakeTimer) {
      store.handshakeTimer = window.setTimeout(() => {
        if (!store.ready) {
          store.handshakeTimeout = true;
          setFallbackVisible(store, true);
          setStatus(store, 'render warning', 'Preview bridge timeout. Showing structured fallback.');
        }
      }, 2000);
    }
  };

  const buildPayload = (props, store) => {
    const entryData = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const slug = String(props.entry && props.entry.get ? props.entry.get('slug') || '' : '').trim();
    const resolvedAssets = buildResolvedAssets(entryData, props.getAsset);

    if (hasBlobAsset(resolvedAssets)) {
      setStatus(store, 'asset pending', 'Using local blob URLs for unpublished uploads.');
    }

    return {
      version: PROTOCOL_VERSION,
      type: MESSAGE_TYPES.UPDATE,
      payload: {
        page: store.mode,
        collection: store.mode === 'home' ? 'pages' : 'apartments',
        slug,
        locale: store.locale,
        highlight: store.highlight,
        activePath: store.activePath || null,
        data: entryData,
        resolvedAssets,
        sentAt: Date.now(),
      },
    };
  };

  const bindGlobalListeners = () => {
    if (listenersBound) return;
    listenersBound = true;

    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;

      const matchingStore = Array.from(stores.values()).find((store) => {
        const iframe = getPreviewPaneDocument().getElementById(store.iframeId);
        return iframe && iframe.contentWindow === event.source;
      });

      if (!matchingStore) return;

      const data = event.data;
      if (!data || typeof data !== 'object' || data.version !== PROTOCOL_VERSION) return;

      if (data.type === MESSAGE_TYPES.READY) {
        matchingStore.ready = true;
        matchingStore.handshakeTimeout = false;
        setFallbackVisible(matchingStore, false);

        if (matchingStore.handshakeTimer) {
          window.clearTimeout(matchingStore.handshakeTimer);
          matchingStore.handshakeTimer = null;
        }

        setStatus(matchingStore, 'synced', '');
        queueUpdate(matchingStore, true);
        return;
      }

      if (data.type === MESSAGE_TYPES.ACK) {
        const ackStatus = typeof data.status === 'string' ? data.status : 'synced';
        const ackMessage = typeof data.message === 'string' ? data.message : '';
        setStatus(matchingStore, ackStatus, ackMessage);
        return;
      }

      if (data.type === MESSAGE_TYPES.REQUEST_FOCUS) {
        const path = typeof data.path === 'string' ? data.path.trim() : '';
        if (!path) return;

        const input = findBestInputMatch(path);
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof input.focus === 'function') {
            input.focus({ preventScroll: true });
          }
          setStatus(matchingStore, 'synced', `Focused field for ${path}.`);
          return;
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard
            .writeText(path)
            .then(() => {
              setStatus(matchingStore, 'render warning', `No direct field match. Copied path: ${path}`);
            })
            .catch(() => {
              setStatus(matchingStore, 'render warning', `No direct field match for ${path}.`);
            });
        } else {
          setStatus(matchingStore, 'render warning', `No direct field match for ${path}.`);
        }
      }
    });

    document.addEventListener('focusin', (event) => {
      if (!activeStoreKey || !stores.has(activeStoreKey)) return;
      const store = stores.get(activeStoreKey);
      if (!store.highlight) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const raw = [
        target.getAttribute('name'),
        target.getAttribute('id'),
        target.getAttribute('aria-label'),
      ].find((value) => typeof value === 'string' && value.trim().length > 0);

      if (!raw) return;

      const normalized = String(raw)
        .replace(/^data\./, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\.?(fields?|widgets?)\.?/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');

      if (!normalized) return;

      store.activePath = normalized;
      if (store.latestPayload) {
        store.latestPayload.payload.activePath = normalized;
      }

      queueUpdate(store, false);
    }, true);
  };

  const renderToolbarButton = (label, id, value, onClick, active) => h(
    'button',
    {
      type: 'button',
      id,
      className: ['cms-preview-toolbar-button', active ? 'is-active' : ''].join(' ').trim(),
      'data-cms-value': value || undefined,
      onClick,
    },
    label,
  );

  const renderFrame = (props, mode) => {
    const entryData = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const slug = String(props.entry && props.entry.get ? props.entry.get('slug') || '' : '').trim().toLowerCase();
    const keyBase = `${mode}-${slug || 'draft'}`.replace(/[^a-z0-9_-]+/gi, '-');
    const key = keyBase || `${mode}-preview`;

    const store = ensureStore(key, mode);
    activeStoreKey = key;

    const source = mode === 'apartments'
      ? `/cms-preview/apartment?cmsPreview=1${slug ? `&slug=${encodeURIComponent(slug)}` : ''}`
      : '/cms-preview/home?cmsPreview=1';

    store.source = source;
    store.latestPayload = buildPayload(props, store);

    bindGlobalListeners();
    setTimeout(() => {
      bindStoreDom(store);
      queueUpdate(store, false);
    }, 0);

    const fallbackJson = JSON.stringify(entryData, null, 2);

    return h(
      'div',
      { id: store.rootId, className: 'cms-preview-wrapper', key: store.key },
      h(
        'div',
        { className: 'cms-preview-toolbar' },
        h(
          'div',
          { className: 'cms-preview-toolbar-group', id: store.localeGroupId },
          renderToolbarButton('DE', undefined, 'de', () => setLocale(store, 'de'), store.locale === 'de'),
          renderToolbarButton('EN', undefined, 'en', () => setLocale(store, 'en'), store.locale === 'en'),
        ),
        h(
          'div',
          { className: 'cms-preview-toolbar-group', id: store.viewportGroupId },
          renderToolbarButton('Desktop', undefined, 'desktop', () => setViewport(store, 'desktop'), store.viewport === 'desktop'),
          renderToolbarButton('Tablet', undefined, 'tablet', () => setViewport(store, 'tablet'), store.viewport === 'tablet'),
          renderToolbarButton('Mobile', undefined, 'mobile', () => setViewport(store, 'mobile'), store.viewport === 'mobile'),
        ),
        h(
          'div',
          { className: 'cms-preview-toolbar-group' },
          renderToolbarButton(store.highlight ? 'Highlight: On' : 'Highlight: Off', store.highlightButtonId, '', () => toggleHighlight(store), store.highlight),
          h('span', { id: store.statusId, className: ['cms-preview-status', `status-${store.status.replace(/\s+/g, '-')}`].join(' ') }, store.status),
        ),
      ),
      h('p', { id: store.noteId, className: 'cms-preview-note', style: { display: store.statusNote ? 'block' : 'none' } }, store.statusNote),
      h(
        'div',
        { className: 'cms-preview-frame-stage' },
        h(
          'div',
          { id: store.frameShellId, className: 'cms-preview-frame-shell', style: { width: store.viewport === 'tablet' ? '860px' : store.viewport === 'mobile' ? '430px' : '100%' } },
          h('iframe', {
            id: store.iframeId,
            className: 'cms-preview-iframe',
            src: store.source,
            title: 'Visual CMS Preview',
          }),
        ),
      ),
      h(
        'div',
        { id: store.fallbackId, className: 'cms-preview-fallback', style: { display: 'none' } },
        h('p', { className: 'cms-preview-fallback-title' }, 'Visual bridge unavailable. Showing structured fallback.'),
        h('pre', { id: store.fallbackJsonId, className: 'cms-preview-fallback-json' }, fallbackJson),
      ),
    );
  };

  const UnsupportedPreview = (props) => {
    const data = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    return h(
      'div',
      { className: 'cms-preview-fallback', style: { display: 'block' } },
      h('p', { className: 'cms-preview-fallback-title' }, 'High-fidelity visual preview is enabled for homepage and apartments in this wave.'),
      h('pre', { className: 'cms-preview-fallback-json' }, JSON.stringify(data, null, 2)),
    );
  };

  const ApartmentsTemplate = (props) => renderFrame(props, 'apartments');

  const PagesTemplate = (props) => {
    const entryData = toJS(props.entry && props.entry.get && props.entry.get('data'), {});
    const slug = String(props.entry && props.entry.get ? props.entry.get('slug') || '' : '').trim().toLowerCase();
    if (!isHomeEntry(entryData, slug)) {
      return h(UnsupportedPreview, props);
    }

    return renderFrame(props, 'home');
  };

  cms.registerPreviewTemplate('apartments', ApartmentsTemplate);
  cms.registerPreviewTemplate('pages', PagesTemplate);
  cms.registerPreviewTemplate('home', (props) => renderFrame(props, 'home'));
})();
