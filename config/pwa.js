export const pwaOptions = {
  registerType: 'prompt',
  includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
  manifest: {
    id: '/',
    name: '아울리',
    short_name: '아울리',
    description: '대학생의 심야 귀가를 돕는 아울리',
    lang: 'ko',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#ffffff',
    background_color: '#ffffff',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
    // Runtime API, chat and map responses must stay on the network.
    runtimeCaching: [],
  },
};
