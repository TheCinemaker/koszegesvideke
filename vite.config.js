import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Az oldal nyilvános címe (kanonikus URL, sitemap, Open Graph). A Netlify buildeléskor az URL
// változóban adja meg a saját címét; saját domainnél a VITE_SITE_URL felülírja.
if (!process.env.VITE_SITE_URL && process.env.URL) process.env.VITE_SITE_URL = process.env.URL

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
