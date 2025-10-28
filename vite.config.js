import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  define: { global: "globalThis" }, // harmless & fixes rare mqtt bundle globals
  optimizeDeps: { include: ["mqtt/dist/mqtt.min.js"] },
})
