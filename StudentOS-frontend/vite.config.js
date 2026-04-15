import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/extract': 'http://localhost:5000',
      '/edit-pdf': 'http://localhost:5000',
      '/health':   'http://localhost:5000',
    }
  }
})