import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Adjust base if deploying to a subpath, e.g. '/myapp/'
// Set to '/' for root
const basePath = '/';

export default defineConfig({
  base: basePath, // Base public path
  plugins: [react()],
  optimizeDeps: {
    include: ['lightweight-charts'], // <-- Force Vite to pre-bundle this dependency
  },
  build: {
    sourcemap: true, // Source maps for debugging production builds
  },
  server: {
    port: 5173,
    open: true,
  },
});
