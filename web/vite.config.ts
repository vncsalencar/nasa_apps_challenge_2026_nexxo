import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on the local network too, so a phone can open the app.
    host: true,
    // Forward API calls to the Node server during development.
    proxy: {
      // API_PORT lets a second copy of the app run beside the first one, for tests.
      '/api': `http://localhost:${process.env.API_PORT ?? 3001}`,
    },
  },
})
