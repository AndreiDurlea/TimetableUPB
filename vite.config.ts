import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    fs: {
      strict: false
    }
  },
  appType: 'spa',
});
