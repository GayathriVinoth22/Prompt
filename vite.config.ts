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
      },
      plugins: [
        copy({
          targets: [
            { src: 'src/manifest.json', dest: 'dist' },
            { src: 'src/content.js', dest: 'dist' }
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