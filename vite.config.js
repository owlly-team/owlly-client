import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import svgr from 'vite-plugin-svgr'
import { fileURLToPath } from 'node:url'
import { createDevApiProxy } from './config/devApiProxy.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), svgr()],
    server: {
      proxy: createDevApiProxy(env.VITE_API_BASE_URL),
      headers: {
        'Cache-Control': 'no-store',
      },
      watch: {
        // Detect saved changes even when filesystem events are missed.
        usePolling: true,
        interval: 300,
      },
    },
  }
})
