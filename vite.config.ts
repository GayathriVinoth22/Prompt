import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        popup: resolve(__dirname, 'src/popup.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'popup' ? 'popup.js' : 'assets/[name]-[hash].js';
        },
      },
      plugins: [
        copy({
          targets: [
            { src: 'src/manifest.json', dest: 'dist' },
            { src: 'src/content.js', dest: 'dist' },
            { src: 'src/background.js', dest: 'dist' },
            { src: 'src/popup.js', dest: 'dist' },
            { src: 'src/popup.html', dest: 'dist' },
          ],
          hook: 'writeBundle',
        })
      ],
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})