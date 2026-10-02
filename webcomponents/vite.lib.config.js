import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: 'terser',
    lib: {
      entry: './src/main.js',
      formats: ['es'],
      name: 'GancioEvents',
      fileName: format => `gancio-events.${format}.js`
    }
  },
  plugins: [svelte({ compilerOptions: { customElement: true } })]
})
