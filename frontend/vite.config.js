import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({ registerType: 'autoUpdate' })
  ],
  build: {
    // Disable source maps in production to prevent exposing
    // folder structure and source code via browser DevTools
    sourcemap: mode !== 'production' ? true : false,
  },
}))
