import { setupCalendar, Calendar, DatePicker } from 'v-calendar'
import 'v-calendar/style.css'

export default defineNuxtPlugin((nuxtApp) => {
  // Use plugin with optional defaults
  nuxtApp.vueApp.use(setupCalendar, {})
  nuxtApp.vueApp.component('Calendar', Calendar)
  nuxtApp.vueApp.component('DatePicker', DatePicker)
})
