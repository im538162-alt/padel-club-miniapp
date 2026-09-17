import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Padel Club',
        short_name: 'Padel Club',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0b1511',
        background_color: '#0b1511',
        lang: 'ru',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Кэшируем только оболочку приложения и статику — ни одного запроса
        // к Supabase (REST/Functions) сюда не попадает, так что офлайн
        // бронирование не должно казаться доступным: экраны просто покажут
        // существующие состояния ошибки сети.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
