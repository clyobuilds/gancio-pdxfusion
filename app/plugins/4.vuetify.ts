import { createVuetify, type LocaleMessages, type LocaleOptions } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
// import { ca, cs, de, en, es, fr, it, nl, pl, pt, tr, sk, sv, ro, ru, zhHans } from 'vuetify/lib/locale/index.mjs'

// import 'vuetify/styles'
// import '@mdi/font/css/materialdesignicons.css'

export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n
  const current = i18n.locale
  const fallback = i18n.fallbackLocale
  const messages = i18n.messages
  const currentLocale = ref(current.value)

  const settings = useState<Settings>('settings')

  const cookie = useCookie<'light' | 'dark' | 'system' | undefined>('theme')
  const defaultTheme = cookie.value ?? (settings?.value?.['theme.is_dark'] ? 'dark' : 'light')
  watch(currentLocale, (val, oldVal) => {
    if (oldVal)
      i18n.setLocale(val)
  }, { immediate: true, flush: 'post' })

  nuxtApp.hook('i18n:localeSwitched', ({ newLocale }) => {
    currentLocale.value = newLocale
  })

  function inferDecimalSeparator(n: ReturnType<typeof useI18n>['n']) {
    return n(0.1).includes(',') ? ',' : '.'
  }

  // todo: add formatNumber, formatCurrency, formatDateTime, formatDate, formatTime...
  function createProvideFunction(data: {
    current: Ref<string>
    fallback: Ref<string>
    messages: Ref<LocaleMessages>
  }) {
    return (props: LocaleOptions) => {
      const currentLocale = ref(props.locale ?? data.current.value)

      const i18n = useI18n({
        locale: currentLocale.value,
        fallbackLocale: data.fallback.value,
        messages: data.messages.value,
        useScope: 'local',
        legacy: false,
        inheritLocale: false
      })

      watch(currentLocale, (val, oldVal) => {
        if (oldVal)
          i18n.setLocale(val)
      }, { immediate: true, flush: 'post' })

      const t = wrapI18n(i18n.t)
      const n = wrapI18n(i18n.n)

      return {
        name: 'nuxt-vue-i18n',
        current: currentLocale,
        fallback: data.fallback,
        messages: data.messages,
        t,
        n,
        decimalSeparator: toRef(() => props.decimalSeparator ?? inferDecimalSeparator(n)),
        provide: createProvideFunction({ current: currentLocale, fallback: data.fallback, messages: data.messages })
      }
    }
  }
  function wrapI18n<T extends (...args: any[]) => any>(fn: T): T {
    return ((...args: Parameters<T>) => fn(...args)) as T
  }

  const vuetify = createVuetify({
    locale: {
      adapter: {
        name: 'nuxt-vue-i18n',
        current: currentLocale,
        fallback,
        messages,
        t: (key, ...params) => i18n.t(key, params),
        n: i18n.n,
        provide: createProvideFunction({ current: currentLocale, fallback, messages }),
        decimalSeparator: toRef(() => inferDecimalSeparator(i18n.n))
      },
      rtl: i18n.locales.value.reduce((acc: Record<string, boolean>, locale: any) => {
        acc[locale.code] = locale.dir === 'rtl'
        return acc
      }, {})
    },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: { mdi }
    },
    theme: {
      defaultTheme,
      themes: {
        dark: {
          dark: true,
          colors: {
            primary: '#FF6E40', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00',
            ...(settings.value?.dark_colors ?? {})
          }
        },
        light: {
          dark: false,
          colors: {
            surface: '#f8f8f8',
            primary: '#FF4500', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FB8C00',
            ...(settings.value?.light_colors ?? {})
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
      VNumberInput: {
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

  nuxtApp.vueApp.use(vuetify)
})
