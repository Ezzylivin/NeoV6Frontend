import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Generate source maps during build for easier debugging in production
  build: {
    sourcemap: true,
  },

  // You can add dev server config here later if needed, e.g.:
  server: {
     port: 3000,
     open: true,
     proxy: {
       '/api': {
         target: 'http://localhost:8000',
         changeOrigin: true,
         secure: false,
       },
     },
   },
});
