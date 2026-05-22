import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: "/myai/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/myai/api": {
        target: "http://localhost:8000", // local dev — for docker use http://backend:8000
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/myai/, ""),
      },
    },
  },
})
