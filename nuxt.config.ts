import { defineNuxtConfig } from 'nuxt/config'
import { version } from './package.json'
import locales from './server/i18n/locales'
import vitePluginVuetify from 'vite-plugin-vuetify'
import { fileURLToPath } from 'url'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const isBuild = process.env.NODE_ENV === 'production'
const isTest = process.env.VITEST == 'true'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devServer: {
    host: '0.0.0.0',
    port: 13120
  },
  experimental: {
    serverAppConfig: false
  },
  compatibilityDate: '2025-07-20',
  // 2025-07-20

  devtools: {
    enabled: true,
    timeline: {
      enabled: false
    }
  },
  sourcemap: {
    server: !isBuild,
    client: !isBuild
  },
  css: [
    'vuetify/styles',
    '~/assets/css/main.css',
    '@mdi/font/css/materialdesignicons.css'
  ],
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', (!isTest && '@nuxtjs/sitemap'), '@nuxt/hints'],
  sitemap: {
    cacheMaxAgeSeconds: 3600, // 1 hour
    // private or action pages: robots.txt already blocks them, so they must not be listed for search engines either
    exclude: ['/admin', '/admin/**', '/add', '/login', '/register', '/recover/**', '/settings', '/my_events', '/export', '/authorize', '/setup/**', '/user_confirm/**'],

    sources: [
      '/api/sitemap/events',
      '/api/sitemap/tags',
      '/api/sitemap/places'
    ],

    // Optional defaults
    defaults: {
      changefreq: 'weekly',
      priority: 0.7
    }
  },
  i18n: {
    defaultLocale: 'en',
    lazy: !isTest,
    langDir: !isTest ? 'locales/' : undefined, // must be set, but won’t be used for actual loading
    types: 'composition',
    pages: undefined,
    locales: isTest
      ? []
      : Object.keys(locales).map(key => ({
          code: key,
          name: locales[key],
          dir: ['ar', 'fa', 'ta'].includes(key) ? 'rtl' : 'ltr',
          file: 'loader.ts'
        })),
    compilation: {
      strictMessage: false
    },
    strategy: 'no_prefix',
    vueI18n: 'i18n.config.js'
  },
  vue: {
    compilerOptions: {
      isCustomElement: (tag: string) => ['gancio-events', 'gancio-event'].includes(tag)
    }
  },
  features: {
    inlineStyles: false
  },
  runtimeConfig: {
    public: {
      version
    }
  },
  build: {
    transpile: ['vuetify', '@vue-leaflet/vue-leaflet']
  },
  vite: {
    esbuild: {
      sourcemap: !isBuild
    },
    optimizeDeps: {
      include: ['lodash/debounce', 'luxon', 'linkifyjs', 'mitt', 'v-calendar', '@vue/devtools-core',
        '@vue/devtools-kit', '@tiptap/vue-3', '@tiptap/starter-kit', '@vueuse/core', '@vue-leaflet/vue-leaflet']
    },
    server: {
      allowedHosts: ['localhost', '127.0.0.1', 'test.cisti.org'],
      watch: {
        usePolling: false
      }
    },
    clearScreen: false,
    define: {
      'process.env.DEBUG': false
    },
    build: {
      sourcemap: !isBuild,
      target: 'esnext'
    },
    plugins: [
      vitePluginVuetify()
    ]
  },
  hooks: {
    // nuxt build will write the needed dependencies in .output/server/package.json
    // but we need to manually add the dependency needed by the CLI that we specify in package.json
    // we use this to merge the dependencies and to clean up the output of package.json needed to run `npm pack`
    close() {
      const nitroPkg = fileURLToPath(new URL('./.output/server/package.json', import.meta.url))
      if (!existsSync(nitroPkg)) {
        console.log('.output/server/package.json not found, skipping merge')
        return
      }
      const sourcePkg = fileURLToPath(new URL('./package.json', import.meta.url))
      const nitroPkgData = JSON.parse(readFileSync(nitroPkg, 'utf8'))
      const { dependencies: nitroDependencies } = nitroPkgData
      const outPkg = fileURLToPath(new URL('./.output/package.json', import.meta.url))
      const source = JSON.parse(readFileSync(sourcePkg, 'utf8'))

      source.dependencies = { ...nitroDependencies, ...source.dependencies }
      delete source.scripts
      delete source.devDependencies
      writeFileSync(outPkg, JSON.stringify(source, null, 2))
    }
  },
  nitro: {
    rollupConfig: {
      // the reason to skip this is because when nuxt build the dependency tree sharp will add multiple native libraries:
      // "@img/sharp-libvips-linux-arm64", "@img/sharp-libvips-linux-x64",
      // "@img/sharp-linux-arm64", "@img/sharp-linux-x64"
      // those libs shouldn't be included in final package.json (we manually add sharp in our package.json in the close hook up there)
      external: ['sharp', 'sqlite3']
    },
    imports: {
      autoImport: false
    },
    inlineDynamicImports: true,
    esbuild: {
      options: {
        target: 'esnext',
        tsconfigRaw: {
          // See https://github.com/nuxt/nuxt/issues/14126
          //     https://github.com/unjs/nitro/issues/273
          compilerOptions: {
            experimentalDecorators: true
          }
        }
      }
    }
  }
})
