import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'HMR-LOGO.png', 'manifest.json'],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
        navigateFallbackDenylist: [/^\/api/]
      }
    })
  ],
  build: {
    // Disable source maps in production to prevent exposing
    // folder structure and source code via browser DevTools
    sourcemap: mode !== 'production' ? true : false,
  },
}))
