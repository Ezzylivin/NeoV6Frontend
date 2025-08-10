import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Adjust base if deploying to a subpath, e.g. '/myapp/'
// Set to '/' for root
const basePath = '/';

export default defineConfig({
  base: basePath,  // Base public path, important if deploying under a subfolder
  plugins: [react()],
  build: {
    sourcemap: true,  // Source maps for debugging production builds
  },
  server: {
    port: 5173,  // Dev server port (Vite default)
    open: true,  // Opens browser automatically on dev server start
  },
});
