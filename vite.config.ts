import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'injectManifest', // IMPORTANT: Allows custom SW logic
        srcDir: 'src',
        filename: 'sw.js',
        devOptions: {
          enabled: true,
          type: 'module', // Required for dev
        },
        manifestFilename: 'manifest.json', // FORCE output as manifest.json to fix 404s/caching issues
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Bolão App',
          short_name: 'Bolão App',
          description: 'Participe dos melhores bolões de futebol!',
          theme_color: '#0A0A0B',
          background_color: '#0A0A0B',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png',
              sizes: '192x192', // We use the same source, allowing browser to scale or user to upload high res
              type: 'image/png'
            },
            {
              src: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://vucvouxutompqoqhxzmi.supabase.co/storage/v1/object/public/app_assets/pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
