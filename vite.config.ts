import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: () => manifest,
      additionalInputs: ['redirector.html'],
    }),
  ],
});
