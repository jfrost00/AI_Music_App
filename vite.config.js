import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend talks only to /api/* on its own origin; Vite proxies those
// calls to the Express server so the API key stays on the backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
