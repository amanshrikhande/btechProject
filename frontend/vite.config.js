import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['@monaco-editor/react'], // Ensure it's bundled
  },
  build: {
    rollupOptions: {
      external: ['@monaco-editor/react'], // Try excluding it
    },
  },
});