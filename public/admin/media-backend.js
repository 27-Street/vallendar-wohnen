(function () {
  const cms = window.CMS || window.DecapCmsApp;
  if (!cms) return;

  const baseBackend = cms.getBackend('git-gateway');
  if (!baseBackend || typeof baseBackend.init !== 'function') {
    console.error('[cms-media] Missing base git-gateway backend.');
    return;
  }

  class GitGatewayRecursiveBackend {
    constructor(config, options) {
      this.inner = baseBackend.init(config, options);
      return new Proxy(this, {
        get: (target, prop, receiver) => {
          if (prop in target) return Reflect.get(target, prop, receiver);
          const value = target.inner[prop];
          return typeof value === 'function' ? value.bind(target.inner) : value;
        },
        set: (target, prop, value) => {
          if (prop in target) {
            target[prop] = value;
            return true;
          }
          target.inner[prop] = value;
          return true;
        },
      });
    }

    async getMedia(mediaFolder = this.inner.mediaFolder) {
      const fallback = () => this.inner.getMedia(mediaFolder);

      try {
        const isGitHubGateway = this.inner?.backendType === 'github';
        const api = this.inner?.api;
        if (!isGitHubGateway || !api || typeof api.listFiles !== 'function') {
          return await fallback();
        }

        const files = await api.listFiles(mediaFolder, { depth: 100 });
        if (!Array.isArray(files)) {
          return await fallback();
        }

        return files
          .filter((file) => file && typeof file.path === 'string')
          .filter((file) => !file.path.split('/').some((segment) => segment.startsWith('.')))
          .map((file) => {
            const id = file.id || file.sha || file.path;
            return {
              id,
              name: file.name || file.path.split('/').pop() || file.path,
              size: typeof file.size === 'number' ? file.size : 0,
              path: file.path,
              displayURL: { id, path: file.path },
            };
          })
          .sort((a, b) => a.path.localeCompare(b.path));
      } catch (error) {
        console.warn('[cms-media] Falling back to default media listing.', error);
        return await fallback();
      }
    }
  }

  if (!cms.getBackend('git-gateway-recursive')) {
    cms.registerBackend('git-gateway-recursive', GitGatewayRecursiveBackend);
  }
})();
