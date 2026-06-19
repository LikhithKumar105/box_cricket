import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5050', // <-- Points to our server.js
        changeOrigin: true,
        secure: false,
      },
    },
  },
});