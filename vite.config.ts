import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the built app loads its assets correctly both when served
  // from a web host AND when loaded from the local filesystem inside Electron.
  base: './',
  server: { port: 5173 },
  build: { target: 'esnext' }
})
