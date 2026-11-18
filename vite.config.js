import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on GitHub Pages (https://<user>.github.io/<repo>/)
  base: './',
  plugins: [tailwindcss(), svelte()]
})
