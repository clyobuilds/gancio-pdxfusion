import vuetify from 'vite-plugin-vuetify'
import imageFigures from 'markdown-it-image-figures'

import path from 'path'
import { writeFileSync, readdirSync, existsSync } from 'node:fs'
import { Feed } from 'feed'
import { defineConfig, createContentLoader } from 'vitepress'
// import { imagetools } from 'vite-imagetools'
import formatPageContentForRSS from './utils/formatPageContentForRSS'
import { useSidebar } from 'vitepress-openapi'
import spec from '../../openapi.json' with { type: 'json' }

const sidebarAPI = useSidebar({ spec })
const formattedPagesForRSS: Record<string, string> = {}

// fix dead link errors on build
process.env.VITE_EXTRA_EXTENSIONS = 'asc' // comma separated list: 'foo,bar,baz'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  head: [
    ['link', { rel: 'alternate', type: 'application/rss+xml', href: '/feed.rss' }],
    ['meta', { name: 'title', content: 'Gancio' }],
    ['meta', { name: 'og:site_name', content: 'Gancio' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'fediverse:creator', content: '@gancio@mastodon.cisti.org' }],
    ['me', { name: 'fediverse:creator', content: '@gancio@mastodon.cisti.org' }]
  ],
  vite: {
    plugins: [vuetify(),
      {
        name: 'load-plugins',
        async load(id) {
          if (id === 'virtual:plugins') {
            const pluginPath = path.join(__dirname, '..', '..', 'plugins')
            const pluginsPath = readdirSync(pluginPath)
            const plugins = await Promise.allSettled(
              pluginsPath.map(async (p) => {
                const indexTsPath = path.join(pluginPath, p, 'index.ts')
                const indexJsPath = path.join(pluginPath, p, 'index.js')
                let pr
                if (existsSync(indexJsPath)) {
                  pr = await import(indexJsPath)
                } else if (existsSync(indexTsPath)) {
                  pr = await import(indexTsPath)
                } else if (existsSync(p) && (p.endsWith('.js') || p.endsWith('.ts'))) {
                  pr = await import(p)
                }
                if (pr) {
                  const plugin = await pr.default({ log: console.log })
                  return plugin.manifest
                }
              })
            )
            return `export default ${JSON.stringify(plugins.map(p => p.status === 'fulfilled' ? p.value : null))}`
          }
          return null
        },
        resolveId(id) {
          if (id === 'virtual:plugins') return id
        }
      }],
    ssr: {
      noExternal: ['vuetify', 'vitepress-openapi']
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vuetify': ['vuetify'],
            'vitepress-openapi': ['vitepress-openapi']
          }
        }
      }
    }
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag: string) => tag.startsWith('gancio-')
      }
    }
  },
  title: 'Gancio',
  description: 'A shared agenda for local communities',
  cleanUrls: true,
  ignoreDeadLinks: [
    /\/feed\.xml/,
    /^\/v1\//
  ],
  markdown: {
    typographer: true,
    config: (md) => {
      md.use(imageFigures, { figcaption: true })
    }
  },
  themeConfig: {
    logo: {
      light: '/assets/gancio-dark.png',
      dark: '/assets/gancio-light.png',
      alt: 'Gancio'
    },
    lastUpdated: {
      formatOptions: {
        dateStyle: 'long'
      }
    },
    editLink: {
      text: 'Edit this page',
      pattern: 'https://framagit.org/les/gancio/-/edit/main/docs/:path'
    },
    search: {
      provider: 'local'
    },
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Instances', link: '/instances' },
      { text: 'Changelog', link: '/changelog' },
      { text: 'Blog', link: '/blog', activeMatch: '/blog' }
    ],

    sidebar: [
      { text: 'Screenshot', link: '/screenshot' },
      // { text: 'FAQ', link: '/faq' },
      {
        text: 'USAGE',
        link: '/usage/',
        collapsed: false,
        items: [
          { text: 'Home', link: '/usage/home' },
          { text: 'Add Event', link: '/usage/add_event' },
          { text: 'Share', link: '/usage/share' },
          { text: 'Settings', link: '/usage/settings' },
          // { text: 'Recurrent', link: '/usage/recurrent' },
          { text: 'Embed events in webpages', link: '/usage/embed' },
          { text: 'Moderation', link: '/usage/moderation' },
          { text: 'Pages', link: '/usage/pages' },
          { text: 'Users', link: '/usage/users' },
          { text: 'Federation', link: '/usage/federation' },
          { text: 'Plugins', link: '/usage/plugins' },
          { text: 'Custom CSS', link: '/usage/custom_css' },
          { text: 'Custom JS', link: '/usage/custom_js' },
          { text: 'CLI', link: '/usage/cli' }
        ]
      },
      {
        text: 'INSTALL', link: '/install/', collapsed: false,
        items: [
          { text: 'Debian', link: '/install/debian' },
          { text: 'Podman', link: '/install/podman' },
          { text: 'Docker', link: '/install/docker' },
          // { text: 'Nixos', link: '/install/nixos' },
          { text: 'Backup', link: '/install/backup' },
          { text: 'Configuration', link: '/install/configuration' },
          { text: 'Nominatim', link: '/install/nominatim' },
          { text: 'Nginx', link: '/install/nginx' }
        ]
      },
      {
        text: 'Hacking', link: '/dev/',
        items: [
          { text: 'Code', link: '/dev/code' },
          { text: 'Internationalization', link: '/dev/locales' },
          { text: 'Plugins', link: '/dev/plugins' },
          { text: 'API', link: '/dev/api',
            items: sidebarAPI.generateSidebarGroups({
              tags: [
                'Login', 'Announcements', 'AP Actors', 'Collections', 'Events',
                'Filters', 'GeoCode', 'ICS', 'Instances', 'Locale', 'Pages',
                'Plugins', 'Resources', 'Session', 'Settings', 'Sitemap',
                'Users', 'Utils'
              ]
            }).map(group => ({
              ...group,
              collapsed: true
            }))
          },
          { text: 'Federation', link: '/dev/federation' }
        ]
      },
      { text: 'About', link: '/about' },
      { text: 'Contacts', link: '/contact' },
      { text: 'Contribute', link: '/contribute' },
      { text: 'Instances', link: '/instances' }
    ],

    socialLinks: [
      { icon: 'git', link: 'https://framagit.org/les/gancio' },
      { icon: 'activitypub', link: 'https://mastodon.cisti.org/@gancio' },
      { icon: 'rss', link: '/feed.xml' }
    ]
  },
  transformHtml(_code, _id, { content, pageData }) {
    const { filePath } = pageData
    const dirname = path.dirname(filePath)
    const basename = path.basename(filePath, '.md')

    if (dirname === 'blog') {
      const html = formatPageContentForRSS(content, 'https://gancio.org/')
      if (html) {
        formattedPagesForRSS[`/${dirname}/${basename}`] = html
      }
    }
  },

  buildEnd: async (config) => {
    const feed = new Feed({
      title: 'Gancio',
      description: 'A shared agenda for local communities',
      id: 'https://gancio.org',
      link: 'https://gancio.org',
      language: 'en'
    })

    const posts = await createContentLoader(`blog/*.md`, {
      excerpt: true,
      render: true,
      includeSrc: true,
      transform (rawData) {
        return rawData.sort((a, b) => {
          return +new Date(b.frontmatter.date).getTime() - +new Date(a.frontmatter.date).getTime()
        })
      }
    }).load()

    for (const { url, excerpt, frontmatter, html } of posts) {
      const improvedHtml = formattedPagesForRSS[url]

      feed.addItem({
        title: frontmatter.title,
        id: `https://gancio.org${url}`,
        link: `https://gancio.org${url}`,
        description: excerpt,
        content: improvedHtml || html,
        author: [
          {
            name: 'Gancio',
            email: 'info@cisti.org',
            link: 'https://gancio.org'
          }
        ],
        date: frontmatter.date
      })
    }

    writeFileSync(path.join(config.outDir, 'feed.xml'), feed.rss2())
  }
})
