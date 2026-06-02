import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const githubRepository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Speech';
const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGithubPages ? `/${githubRepository}/` : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
