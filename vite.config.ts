import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed to https://<user>.github.io/workout-prep/ — every asset URL and the
// service worker scope hang off this. Override with BASE_PATH=/ for root hosting.
const base = process.env.BASE_PATH ?? '/workout-prep/'

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
