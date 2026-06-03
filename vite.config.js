import { defineConfig } from 'vite';
import { copyFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

// Non-module scripts that must be copied as-is to the build output
const legacyScripts = [
  'connectors.js',
  'toolkit.js',
  'intelligence.js',
  'actionable-intel.js',
  'ecosystem.js',
  'content-hub.js',
  'social-dashboard.js',
  'cross-post.js',
  'onboarding.js',
  'cinematic.js',
  'ai-chat.js',
  'voice-control.js',
  'competitive.js',
  'widget-builder.js',
  'app.js',
  'sw.js'
];

function copyLegacyScripts() {
  return {
    name: 'copy-legacy-scripts',
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist/client');
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true });
      }
      for (const file of legacyScripts) {
        const src = path.resolve(__dirname, 'dashboard', file);
        if (existsSync(src)) {
          copyFileSync(src, path.join(outDir, file));
        }
      }
      // Copy manifest.json
      const manifestSrc = path.resolve(__dirname, 'dashboard', 'manifest.json');
      if (existsSync(manifestSrc)) {
        copyFileSync(manifestSrc, path.join(outDir, 'manifest.json'));
      }
    }
  };
}

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig(({ mode }) => ({
  root: 'dashboard',
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    }
  },
  plugins: [copyLegacyScripts()]
}));
