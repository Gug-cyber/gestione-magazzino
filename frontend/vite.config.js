import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const plugins = [react()]
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
          target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})
