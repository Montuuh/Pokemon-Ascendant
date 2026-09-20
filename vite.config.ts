/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Where the app is served from. '/' for dev, tests and any root-hosted deploy; GitHub Pages serves a project
  // site under '/<repo>/', and the Pages workflow sets VITE_BASE to that. Every asset URL goes through
  // src/content/paths.ts, which reads the same value at runtime, so a wrong base fails loudly on the first
  // sprite rather than quietly on the third screen.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    reporters: 'default',
  },
});
