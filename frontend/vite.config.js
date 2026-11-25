import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,          // phone / other devices on same WiFi can open it
    allowedHosts: true,  // allow temporary tunnel links (cloudflare / ngrok)
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
