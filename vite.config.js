import { defineConfig } from 'vite';

// Served from https://<user>.github.io/br/ on GitHub Pages, so assets need
// to resolve under the /br/ subpath instead of the domain root.
export default defineConfig({
  base: '/br/',
});
