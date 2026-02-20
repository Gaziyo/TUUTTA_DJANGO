import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Path alias for shadcn/ui imports
      '@': path.resolve(__dirname, './src'),
      // Force nanoid to use browser-compatible ESM build
      'nanoid': 'nanoid/index.browser.js',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  envPrefix: 'VITE_', // Ensure Vite loads environment variables with VITE_ prefix
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries into separate chunks
          'react-vendor': ['react', 'react-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'pdf': ['pdfjs-dist'],
          'katex': ['katex'],
          'markdown': ['react-markdown', 'remark-math', 'rehype-katex'],
          'ui-libs': ['lucide-react', '@dnd-kit/core', '@dnd-kit/sortable'],
          'editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
          'file-processing': ['mammoth', 'xlsx', 'tesseract.js', 'cheerio'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
