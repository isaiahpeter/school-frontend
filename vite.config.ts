import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'School Portal',
        short_name: 'SchoolApp',
        description: 'School management portal',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/launcher_icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/launcher_icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/launcher_icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/launcher_icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/launcher_icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/launcher_icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/school-api-e09o\.onrender\.com\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
})