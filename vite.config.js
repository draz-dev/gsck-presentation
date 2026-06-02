import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        presenter: resolve(__dirname, 'presenter.html'),
        display: resolve(__dirname, 'display.html')
      }
    }
  }
});
