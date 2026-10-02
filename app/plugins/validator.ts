import * as linkify from 'linkifyjs'
export default defineNuxtPlugin((nuxtApp) => {
  const t = nuxtApp.vueApp.$nuxt.$i18n.t

  const validators: ValidationService = {
    required: (fieldName: string) => (value: unknown) => !!value || t('validators.required', { fieldName: t(fieldName) }),

    requiredMulti: fieldName => values => (Array.isArray(values) && values.length > 0 && values.every(v => !!v)) || t('validators.required', { fieldName: t(fieldName) }),

    password: (value: string) => {
      if (value.length < 8) return 'The password must have at least 8 characters'
      return true
    },

    url: (required = false) => (value: unknown): boolean | string => {
      if (!value && !required) {
        return true
      }

      if (value && typeof value === 'string') {
        try {
          const url = new URL(value)
          if (url.protocol === 'http:' || url.protocol === 'https:') {
            return true
          }
        } catch { /* Invalid url */ }
      }

      return t('validators.url')
    },

    // confirm: (password: string) => (value: string) => password === value || `Password does not match`,

    email: [
      (v: string) => !!v || t('validators.required', { fieldName: t('common.email') }),
      (v: string) => ((v && (v === 'admin' || !!linkify.test(v, 'email'))) || t('validators.email'))
    ],

    latitude: [
      (v: number) => {
        return typeof v === 'undefined' ? true : (v < 90 && v > -90) || t('validators.latitude')
      }
    ],
    longitude: [
      (v: number) => typeof v === 'undefined' ? true : (v < 180 && v > -180) || t('validators.longitude')
    ]
  }

  nuxtApp.provide('valid', validators)
})
