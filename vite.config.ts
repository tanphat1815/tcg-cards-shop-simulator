import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/tcgdex': {
        target: 'https://api.tcgdex.net/v2/en',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tcgdex/, ''),
      },
    },
  },
})
