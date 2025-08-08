import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    sourcemap: true,
  },

  server: {
    port: 3000,
    open: true, // Automatically open browser on start
    proxy: {
      // Proxy API requests to backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // Optional rewrite if your backend routes don't have /api prefix
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
