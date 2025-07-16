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
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/test-utils",
    "@nuxt/ui",
    "@nuxtjs/i18n",
  ],

  ui: {
    theme: {
      colors: [
        "primary",
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
      ],
    },
  },

  i18n: {
    locales: [
      {
        code: "lo",
        name: "Lao PDR",
        file: "lo-LA.json",
      },
      {
        code: "en",
        name: "English (US)",
        file: "en-US.json",
      },
    ],
    lazy: true,
    defaultLocale: "lo",
    vueI18n: "./i18n.config.ts",
  },
});
