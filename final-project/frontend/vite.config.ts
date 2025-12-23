import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'path';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from project root (parent directory) for local development
  // In Vercel, environment variables are set in the dashboard and don't need .env files
  const rootDir = resolve(__dirname, '..');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // Only expose variables prefixed with VITE_ to the client
    envPrefix: 'VITE_',
    // Tell Vite to look for .env files in the project root (for local dev)
    // In production (Vercel), env vars are provided by the platform
    envDir: rootDir,
  };
});
