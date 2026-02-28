(function () {
  const cms = window.CMS || window.DecapCms || window.DecapCmsApp;
  if (!cms) return;

  function registerRecursiveBackend(baseName, recursiveName) {
    const baseBackend = cms.getBackend(baseName);
    if (!baseBackend || typeof baseBackend.init !== 'function') {
      console.warn(`[cms-media] Missing base backend "${baseName}".`);
      return;
    }

    class RecursiveMediaBackend {
      constructor(config, options) {
        this.config = config || {};
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

      async resolveConfiguredMediaFolders(mediaFolder) {
        const folders = new Set();
        const addFolder = (value) => {
          if (typeof value !== 'string') return;
          const normalized = value.trim();
          if (!normalized || normalized.includes('{{')) return;
          folders.add(normalized);
        };

        addFolder(mediaFolder);
        addFolder(this.config.media_folder);

        const collections = Array.isArray(this.config.collections) ? this.config.collections : [];
        const expandSlugTemplate = async (template, collection) => {
          if (typeof template !== 'string' || !template.includes('{{slug}}')) return;
          if (!collection || typeof collection.folder !== 'string') return;

          const extension = typeof collection.extension === 'string' ? collection.extension : 'md';
          const depth = 1;

          try {
            const entries = await this.inner.entriesByFolder(collection.folder, extension, depth);
            const items = Array.isArray(entries) ? entries : [];
            for (const entry of items) {
              const path = entry?.file?.path;
              if (typeof path !== 'string') continue;
              const name = path.split('/').pop() || '';
              const slug = name.replace(/\.[^.]+$/, '');
              if (!slug) continue;
              addFolder(template.replace(/{{\s*slug\s*}}/g, slug));
            }
          } catch (error) {
            console.warn(`[cms-media] Could not expand slug media folders for ${collection.name || 'collection'}.`, error);
          }
        };

        for (const collection of collections) {
          addFolder(collection?.media_folder);
          await expandSlugTemplate(collection?.media_folder, collection);

          const files = Array.isArray(collection?.files) ? collection.files : [];
          for (const fileEntry of files) {
            addFolder(fileEntry?.media_folder);
            await expandSlugTemplate(fileEntry?.media_folder, collection);
          }
        }

        return Array.from(folders).sort();
      }

      async getMedia(mediaFolder = this.inner.mediaFolder) {
        const fallback = () => this.inner.getMedia(mediaFolder);

        try {
          const api = this.inner?.api;
          if (api && typeof api.listFiles === 'function') {
            const files = await api.listFiles(mediaFolder, { depth: 100 });
            if (!Array.isArray(files)) {
              return await fallback();
            }

            return files
              .filter((file) => file && typeof file.path === 'string')
              .filter((file) => !file.path.split('/').some((segment) => segment.startsWith('.')))
              .map((file) => {
                const path = file.path;
                const id = file.id || file.sha || path;
                return {
                  id,
                  name: file.name || path.split('/').pop() || path,
                  size: typeof file.size === 'number' ? file.size : 0,
                  path,
                  displayURL: file.displayURL || { id, path },
                };
              })
              .sort((a, b) => a.path.localeCompare(b.path));
          }

          // Local proxy backend has no listFiles API. Build a recursive-equivalent
          // list by aggregating media from configured folders and slug templates.
          const folders = await this.resolveConfiguredMediaFolders(mediaFolder);
          if (folders.length === 0) {
            return await fallback();
          }

          const folderResults = await Promise.all(
            folders.map(async (folder) => {
              try {
                return await this.inner.getMedia(folder);
              } catch (error) {
                console.warn(`[cms-media] Could not read media folder ${folder}.`, error);
                return [];
              }
            }),
          );

          const mediaByPath = new Map();
          for (const entries of folderResults) {
            const items = Array.isArray(entries) ? entries : [];
            for (const item of items) {
              if (!item || typeof item.path !== 'string') continue;
              if (item.path.split('/').some((segment) => segment.startsWith('.'))) continue;
              mediaByPath.set(item.path, item);
            }
          }

          if (mediaByPath.size === 0) {
            return await fallback();
          }

          return Array.from(mediaByPath.values()).sort((a, b) => a.path.localeCompare(b.path));
        } catch (error) {
          console.warn(`[cms-media] Falling back to default media listing for ${recursiveName}.`, error);
          return await fallback();
        }
      }
    }

    if (!cms.getBackend(recursiveName)) {
      cms.registerBackend(recursiveName, RecursiveMediaBackend);
    }
  }

  registerRecursiveBackend('git-gateway', 'git-gateway-recursive');
  registerRecursiveBackend('proxy', 'proxy-recursive');
})();
