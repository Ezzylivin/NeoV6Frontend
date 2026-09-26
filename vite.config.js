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
    // Don't ship source maps to production (they expose full source).
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split large, rarely-changing vendor code into cacheable chunks so
        // they aren't bundled into every page's entry.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['lightweight-charts', 'recharts'],
          'web3': ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
