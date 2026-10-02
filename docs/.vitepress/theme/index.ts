// https://vitepress.dev/guide/custom-theme
// import { aliases, mdi } from 'vuetify/iconsets/mdi'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'vitepress-openapi/dist/style.css'
import MyLayout from './MyLayout.vue'
import { createVuetify } from 'vuetify'
// import 'vuetify/styles'
// import '@mdi/font/css/materialdesignicons.css'
import './style.css'
import spec from '../../../openapi.json'
const { theme, useOpenapi } = await import('vitepress-openapi/client')

const vuetify = createVuetify({
  theme: {
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#FF6E40', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00'
        }
      },
      light: {
        dark: false,
        colors: {
          surface: '#f8f8f8',
          primary: '#FF4500', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00'
        }
      }
    }
  },
  display: {
    mobileBreakpoint: 800
  },
  ssr: true,
  defaults: {
    global: {
      // variant: 'underlined',
      // elevation: 0,
      // rounded: 0,
    },
    VContainer: {
      maxWidth: 1400
    },
    VDialog: {
      maxWidth: '800'
    },
    VFileInput: {
      prependIcon: '',
      prependInnerIcon: 'mdi-attachment',
      variant: 'underlined'
    },
    VSelect: {
      variant: 'underlined'
    },
    VBtn: {
      elevation: 0,
      ripple: 0
    },
    VTextarea: {
      autocomplete: 'off',
      clearable: false,
      variant: 'underlined'
    },
    VTextField: {
      autocomplete: 'off',
      clearable: true,
      variant: 'underlined'
    },
    VCombobox: {
      variant: 'underlined',
      autocomplete: 'off',
      clearable: true
    },
    VAutocomplete: {
      VChip: {
        closable: true,
        closeIcon: 'mdi-close-circle'
      },
      autocomplete: 'off',
      clearable: true,
      variant: 'underlined'
    },
    VAlert: {
      border: 'start',
      type: 'warning',
      variant: 'tonal',
      rounded: 0
    },
    VSwitch: {
      density: 'compact',
      inset: true,
      color: 'primary'
    },
    VDataTableServer: {
      density: 'compact'
    },
    VDataTableRow: {
      density: 'compact',
      VBtn: {
        variant: 'text',
        tile: true
      }
    },
    VDataTableItem: {
      density: 'compact'
    },
    VCard: {
      color: 'surface',
      variant: 'flat'
    },
    VFooter: {
      VBtn: {
        variant: 'text'
      }
    }
  }
})

export default {
  extends: DefaultTheme,
  Layout: MyLayout,
  enhanceApp({ app }) {
    app.use(vuetify)

    // Set the OpenAPI specification.
    useOpenapi({ spec })

    // Use the theme.
    theme.enhanceApp({ app })
  }
} satisfies Theme
