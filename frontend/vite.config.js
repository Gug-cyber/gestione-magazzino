import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const plugins = [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'icons/*.svg'],
      manifest: false, // uses the manifest.json already present in public/
      workbox: {
        // Cache-first for static assets (JS, CSS, images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // NetworkOnly for API calls (never cache /api/)
        runtimeCaching: [
          // Foto prodotti: NetworkOnly with credentials so the ?token= query param
          // reaches the backend. Must be listed BEFORE the generic /api/ rule.
          {
            urlPattern: /\/api\/prodotti\/\d+\/foto(\?.*)?$/i,
            handler: 'NetworkOnly',
            options: {
              fetchOptions: {
                credentials: 'same-origin',
              },
            },
          },
          // All other API calls: NetworkOnly
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
        // Maximum file size to precache: 3 MB
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        // Enable SW in dev for testing (optional)
        enabled: false,
      },
    }),
  ]
  let serverHttps = false

  if (process.env.VITE_HTTPS === 'true') {
    const certPath = path.resolve(__dirname, 'certs/cert.pem')
    const keyPath = path.resolve(__dirname, 'certs/key.pem')
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      // Use provided certificates
      serverHttps = { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }
    } else {
      // Auto-generate a self-signed cert via @vitejs/plugin-basic-ssl
      const { default: basicSsl } = await import('@vitejs/plugin-basic-ssl')
      plugins.push(basicSsl())
    }
  }

  return {
    plugins,
    server: {
      host: true,
      port: 5173,
      https: serverHttps,
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
