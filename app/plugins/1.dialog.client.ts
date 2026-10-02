import { FetchError } from 'ofetch'
export default defineNuxtPlugin(() => {
  const { $once, $emit } = useNuxtApp() // nuxtApp

  function confirm (msg: string, args?: object) {
    $emit('confirmDialog', { msg, args })
    return new Promise((resolve, _reject) => {
      $once('confirmDialog:result', resolve)
    })
  }

  function notify(msg: string | FetchError | unknown, status: Statuses = Statuses.SUCCESS, args?: object) {
    if ([Statuses.ERROR, Statuses.WARNING].includes(status) && msg instanceof FetchError) {
      msg = msg?.response?._data?.message ?? msg
      // remove Sequelize prefix:
      msg = String(msg).replace(/Sequelize.*: ?/, '')
    }
    $emit('notify', { msg: String(msg), status, args })
  }

  function prompt (msg: string, title: string, label?: string, value?: string) {
    $emit('promptDialog', { msg, title, label, value })
    return new Promise((resolve, _reject) => {
      $once('promptDialog:result', resolve)
    })
  }

  return { provide: { confirm, notify, prompt } }
})
