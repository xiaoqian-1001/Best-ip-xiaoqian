export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2026-08-02',
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },
  vite: {
    server: {
      allowedHosts: ['.monkeycode-ai.online']
    }
  }
})