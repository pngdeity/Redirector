import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import manifest from './manifest.json';

const target = process.env.TARGET || 'chrome';

export default defineConfig({
  build: {
    outDir: `dist/${target}`,
  },
  plugins: [
    webExtension({
      manifest: () => {
        const newManifest: any = { ...manifest };
        if (target === 'firefox') {
          newManifest.background = {
            scripts: ['js/background.ts'],
          };
          newManifest.browser_specific_settings = {
            gecko: {
              id: 'redirector@einaregilsson.com',
              strict_min_version: '115.0',
            },
          };
        } else {
          newManifest.background = {
            service_worker: 'js/background.ts',
          };
        }
        return newManifest;
      },
      additionalInputs: ['redirector.html'],
    }),
  ],
});
