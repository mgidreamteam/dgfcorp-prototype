import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': 'http://localhost:8080'
        }
      },
      build: {
        rollupOptions: {
          external: [
            /^circuit-json-to-.*/,
            'jscad-electronics'
          ]
        }
      },
      optimizeDeps: {
        include: ['xml-reader', 'svgson', 'circuit-to-svg', 'deep-rename-keys'],
        exclude: [
          '@resvg/resvg-js',
          'circuit-json-to-lbrn'
        ]
      },
      plugins: [
          react(),
          commonjs(),
          nodePolyfills({
              include: ['crypto', 'fs', 'path', 'os', 'stream', 'events'],
          })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
