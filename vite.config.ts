/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  // A new id on every build: the players' cached pool (dataLoader.ts) is keyed
  // by it, so a deploy with new artists reaches them right away instead of
  // the next day.
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(Date.now().toString(36)),
  },
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
  },
})