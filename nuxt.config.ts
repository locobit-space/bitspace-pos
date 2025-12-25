// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  ssr: false,

  future: {
    compatibilityVersion: 4,
  },

  css: ["~/assets/css/main.css"],

  modules: [
    "@nuxt/ui",
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@vite-pwa/nuxt",
  ],

  // PWA Configuration for offline mode
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "BitSpace POS",
      short_name: "BitSpace",
      description: "Lightning-powered Point of Sale",
      theme_color: "#f59e0b",
      background_color: "#111827",
      display: "standalone",
      orientation: "any",
      start_url: "/",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2,woff,ttf}"],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Cache QR code API responses
          urlPattern: /^https:\/\/api\.qrserver\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "qr-codes-cache",
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Cache Google Fonts
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "google-fonts-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          // Cache font files
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "gstatic-fonts-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true, // Enable in dev for testing
      type: "module",
    },
  },

  ui: {
    theme: {
      colors: [
        "red",
        "gray",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "sky",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose",
        "amethyst",
        "slate",
        "gray",
        "zinc",
        "neutral",
        "stone",
        "error",
        "warning",
        "info",
        "success",
        "white",
      ],
    },
  },

  icon: {
    // Use local server bundle for better performance
    serverBundle: 'local',
    // Pre-bundle icons used in the app for faster loading
    clientBundle: {
      // Only include icon collections you actually use
      icons: [],
      // Include full icon sets you use
      includeCustomCollections: true,
    },
    // Customize icon rendering
    customCollections: [],
    // Provider settings
    provider: 'iconify',
  },

  i18n: {
    locales: [
      {
        code: "lo",
        name: "Lao PDR",
        file: "lo-LA.json",
        iso: "lo-LA",
      },
      {
        code: "en",
        name: "English (US)",
        file: "en-US.json",
        iso: "en-US",
      },
    ],
    lazy: true,
    defaultLocale: "lo",
    vueI18n: "./i18n.config.ts",
    bundle: {
      optimizeTranslationDirective: false,
    },
  },
});
