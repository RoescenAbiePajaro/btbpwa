import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** TF Hub blocks CORS; proxy so the browser hits same-origin /__tfhub__ instead. */
const tfhubProxy = {
  target: 'https://tfhub.dev',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/__tfhub__/, ''),
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/__tfhub__': tfhubProxy,
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/__tfhub__': tfhubProxy,
    },
  },
});