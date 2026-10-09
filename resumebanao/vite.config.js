import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // With VITE_DEMO_MODE=false, run `npm run dev:server` alongside `npm run dev`.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'node',
  },
})
