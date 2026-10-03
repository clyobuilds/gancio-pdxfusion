<script setup lang='ts'>

import { DateTime } from 'luxon'
const time = useTime()
const { isAdmin } = useAuth()
const { attributes, events } = useEvents()
const { theme } = useAppTheme()
const settings = useState<Settings>('settings')
const { t } = useI18n()
const event = defineModel<EventAPI>('event', { type: Object, required: true })

if (!event.value.recurrent) {
  event.value.recurrent = {}
}
const initialCalendarPage = useInitialCalendarPage()

const frequencies = [
  { value: '1w', text: t('event.each_week') },
  { value: '2w', text: t('event.each_2w') },
  { value: '1m', text: t('event.each_month') },
  { value: '1y', text: t('event.each_year') }
]

const eventIsMultidate = computed(() => time.isMultiDate(event.value.start_datetime, event.value.end_datetime))
const type = ref(event.value.recurrent?.frequency ? 'recurrent' : eventIsMultidate.value ? 'multidate' : 'normal')

// last day of the recurrence (yyyy-MM-dd), stored as the end of that day in the instance timezone
const recurrentUntil = computed({
  get: () => event.value.recurrent?.until ? time.unixFormat(event.value.recurrent.until, 'yyyy-MM-dd') : null,
  set: (day: string | null) => {
    if (!event.value.recurrent) return
    const until = day ? DateTime.fromISO(day, { zone: settings.value.instance_timezone }).endOf('day') : null
    event.value.recurrent.until = until?.isValid ? until.toUnixInteger() : null
  }
})

const selectedDates = ref<{ start?: Date, end?: Date } | null>({
  start: event.value.start_datetime ? new Date(event.value.start_datetime * 1000) : undefined,
  end: event.value.end_datetime ? new Date(event.value.end_datetime * 1000) : undefined
})

const selectedStartTime = ref<string | null>(event.value.start_datetime ? time.unixFormat(event.value.start_datetime, 'HH:mm') : null)
const selectedEndTime = ref<string | null>(event.value.end_datetime ? time.unixFormat(event.value.end_datetime, 'HH:mm') : null)

// time choices every 15 minutes, e.g. { title: '7:15 PM', value: '19:15' }
const timeOptions = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = (i % 4) * 15
  return {
    title: `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`,
    value: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
})

const todayEvents = computed(() => {
  if (!events.value || !selectedDates.value?.start) {
    console.error('no selected date')
    return []
  }
  const startOfDay = DateTime.fromJSDate(selectedDates.value.start).startOf('day').toSeconds()
  const endOfDay = DateTime.fromJSDate(selectedDates.value.end ? selectedDates.value.end : selectedDates.value.start).endOf('day').toSeconds()

  return events?.value?.filter(e => e.id !== event.value.id && e.start_datetime >= startOfDay && e.start_datetime <= endOfDay)
})

const whenPatterns = computed(() => {
  if (!event.value.recurrent) return []
  if (typeof selectedDates.value?.start === 'undefined') return []
  const date = DateTime.fromJSDate(selectedDates.value.start)
  const freq = event.value.recurrent.frequency
  const weekDay = date.toFormat('EEEE')
  if (freq === '1w' || freq === '2w') {
    return t(`event.recurrent_${freq}_days`, { days: weekDay }).toUpperCase()
  } else if (freq === '1m' || freq === '2m') {
    const n = Math.floor((date.day - 1) / 7) + 1

    const patterns: { label: string, key: 'ordinal' | number }[] = [
      { label: t(`event.recurrent_${freq}_days`, { days: date.day }), key: 'ordinal' }
    ]

    if (n < 5) {
      patterns.push({
        label: t(`event.recurrent_${freq}_ordinal`, { n: t(`ordinal.${n}`), days: weekDay }),
        key: n
      })
    }

    // if selected day is in last week, propose also this type of selection
    const lastWeek = date.endOf('month').day - date.day < 7
    if (lastWeek) {
      patterns.push({
        label: t(`event.recurrent_${freq}_ordinal`, { n: t('ordinal.-1'), days: weekDay }),
        key: -1
      })
    }

    return patterns
  // } else if (freq === '1d') {
  //   return t('event.recurrent_each_day')
  }
  return []
})

// update event start/end datetime when dates or times change
watch([selectedDates, selectedStartTime, selectedEndTime], ([dates, startTime, endTime]) => {
  // if no date or time is selected, reset datetime fields
  if (!startTime || !dates?.start) {
    event.value.start_datetime = 0
    event.value.end_datetime = undefined
    return
  }

  event.value.start_datetime = time.fromDateAndTime(dates.start, startTime)
  event.value.end_datetime = endTime ? time.fromDateAndTime(dates?.end ? dates.end : dates.start, endTime) : undefined
})

// normalize DatePicker input
const pickDates = computed({
  get: () => type.value === 'multidate' ? selectedDates.value : selectedDates.value?.start,
  set: (dates: Date | { start?: Date, end?: Date } | null) => {
    if (dates instanceof Date) {
      selectedDates.value = { start: dates, end: undefined }
    } else {
      selectedDates.value = dates
    }
  }
})
</script>

<template>
<v-col cols="12">
  <div class="text-center">
    <v-btn-toggle
      v-if="!event.parentId"
      v-model="type"
      class="flex-wrap flex-row"
      variant='outlined'
      color="primary"
      mandatory
    >
      <v-btn value="normal" label="normal">{{ t('event.normal') }}</v-btn>
      <v-btn v-if="settings.allow_multidate_event" value="multidate" label="multidate">{{ t('event.multidate') }}</v-btn>
      <v-btn v-if="settings.allow_recurrent_event" value="recurrent" label="recurrent">{{ t('event.recurrent') }}</v-btn>
    </v-btn-toggle>

    <p>{{ t(`event.${type}_description`) }}</p>
    <v-btn-toggle
      v-if="type === 'recurrent' && event?.recurrent"
      v-model="event.recurrent.frequency"
      class="v-col-6 flex-column flex-sm-row"
      color="primary"
    >
      <v-btn v-for="f in frequencies" :key="f.value" :value="f.value">{{ f.text }}</v-btn>
    </v-btn-toggle>

    <div class="mx-auto d-block mt-3">
      <DatePicker
        v-model='pickDates'
        :rules="[$valid.required('common.when')]"
        class='mx-auto'
        :is-dark="theme.current?.value?.dark"
        :is-range="type === 'multidate'"
        :locale="$i18n.locale"
        :attributes="attributes"
        is-inline
        :min-date="!isAdmin ? new Date() : undefined"
        :initial-page="pickDates ? undefined : initialCalendarPage"
        is-expanded
      />
    </div>

  </div>

  <div v-if="type === 'recurrent'" class="text-center mb-2">
    <span v-if="event.recurrent?.frequency !== '1m' && event.recurrent?.frequency !== '2m'">{{ whenPatterns }}</span>
    <v-btn-toggle
      v-else
      v-model="event.recurrent.type"
      class="mt-1 flex-column flex-sm-row"
    >
      <v-btn
        v-for="whenPattern in whenPatterns"
        :key="whenPattern.key"
        :value="whenPattern.key"
        size='small'
      >{{ whenPattern.label }}</v-btn>
    </v-btn-toggle>

    <v-text-field
      v-model='recurrentUntil'
      class='mx-auto mt-4 text-start'
      max-width='320'
      type='date'
      :min="event.start_datetime ? time.unixFormat(event.start_datetime, 'yyyy-MM-dd') : undefined"
      :label="t('event.recurrent_until')"
      :hint="t('event.recurrent_until_help')"
      prepend-icon='mdi-calendar-end'
      persistent-hint
      persistent-placeholder
      clearable />
  </div>

  <v-row class="mt-3 col-md-6 mx-auto datePicker">

    <v-col class="col-12 col-sm-6">
      <v-select
        v-model='selectedStartTime'
        :items='timeOptions'
        :label="t('event.from')"
        :rules="[$valid.required('event.from')]"
        prepend-icon='mdi-clock-time-four-outline' />
    </v-col>

    <v-col class="col-12 col-sm-6">
      <!-- :disabled="!value.fromHour" -->
      <v-select
        v-model='selectedEndTime'
        :items='timeOptions'
        :rules="[settings.allow_event_without_end_time && type !== 'multidate' ? true : $valid.required('event.due')]"
        :label="t('event.due')"
        :clearable='settings.allow_event_without_end_time'
        prepend-icon='mdi-clock-time-eight-outline' />
    </v-col>

  </v-row>

</v-col>

<CoreEventList v-if='todayEvents.length' :events='todayEvents' :title='t("event.same_day")' />

<!-- // import { DateTime } from 'luxon'
// import { mapState, mapActions, mapGetters } from 'vuex'
// import List from '@/components/List'
// import { mdiClockTimeFourOutline, mdiClockTimeEightOutline, mdiClose } from '@mdi/js'

// export default {
//   name: 'DateInput',
//   components: { List },
//   props: {
//     value: { type: Object, default: () => ({ from: null, due: null, recurrent: null, fromHour: null, dueHour: null }) },
//     event: { type: Object, default: () => null }
//   },
//   data() {
//     return {
//       mdiClockTimeFourOutline, mdiClockTimeEightOutline, mdiClose,
//       allowedMinutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
//       menuFromHour: false,
//       menuDueHour: false,
//       type: this.value.type || 'normal',
//       frequencies: [
//         { value: '1w', text: this.$t('event.each_week') },
//         { value: '2w', text: this.$t('event.each_2w') },
//         { value: '1m', text: this.$t('event.each_month') }
//       ]
//     }
//   },
//   computed: {
//     ...mapState(['settings', 'events']),
//     ...mapGetters(['is_dark']),
//     fromDate () {
//       if (this.value.from) {
//         if (this.value.multidate) {
//           return ({ start: new Date(this.value.from), end: new Date(this.value.due) })
//         } else {
//           return new Date(this.value.from)
//         }
//       }
//     },
//     todayEvents() {
//       const start = this.$time.startOfDay(this.value.from)
//       const end = this.$time.endOfDay(this.value.from)
//       return this.events.filter(e => e.id !== this.event.id && e.start_datetime >= start && e.start_datetime <= end)
//     },
//     attributes() {
//       return this.$time.attributesFromEvents(this.events.filter(e => e.id !== this.event.id))
//     },
//   },
//   async mounted() {
//     if (this.value.multidate) {
//       this.type = 'multidate'
//     } else if (this.value.recurrent) {
//       this.type = 'recurrent'
//     } else {
//       this.type = 'normal'
//     }
//     if (!this.events) {
//       this.getEvents()
//     }
//   },
 //   methods: {
//     ...mapActions(['getEvents']),
//     updateRecurrent(value) {
//       this.$emit('input', { ...this.value, recurrent: value || null })
//     },
//     change(what, value) {
//       // change event's type
//       if (what === 'type') {
//         if (typeof value === 'undefined') { this.type = 'normal' }
//         if (value === 'recurrent') {
//           this.$emit('input', { ...this.value, due: null, recurrent: { frequency: '1w' }, multidate: false })
//         } else if (value === 'multidate') {
//           this.$emit('input', { ...this.value, recurrent: null, multidate: true })
//         } else {
//           let from = this.value.from
//           if (from && from.start) {
//             from = from.start
//           }
//           let due = this.value.multidate ? null : this.value.due
//           if (due && due.start) {
//             due = due.start
//           }
//           this.$emit('input', { ...this.value, from, due, recurrent: null, multidate: false })
//         }
//       } else if (what === 'frequency') {
//         if (typeof value === 'undefined') { value = '1w' }
//         this.$emit('input', { ...this.value, recurrent: { ...this.value.recurrent, frequency: value } })
//       } else if (what === 'recurrentType') {
//         this.$emit('input', { ...this.value, recurrent: { ...this.value.recurrent, type: value } })
//       } else if (what === 'fromHour') {
//         if (value) {
//           this.$emit('input', { ...this.value, fromHour: value })
//         } else {
//           this.$emit('input', { ...this.value, fromHour: null, dueHour: null })
//         }
//       } else if (what === 'dueHour') {
//         if (value) {
//           this.value.due = this.value.due ? this.value.due : this.value.from
//           const [hour, minute] = value.split(':')
//           const [fromHour, fromMinute] = this.value.fromHour.split(':')
//           if (!this.value.multidate) {
//             if (hour < fromHour) {
//               this.value.due = DateTime.fromJSDate(this.value.from, {zone: this.settings.instance_timezone}).plus({day: 1}).toJSDate()
//             } else {
//               this.value.due = DateTime.fromJSDate(this.value.from, {zone: this.settings.instance_timezone}).toJSDate()
//             }
//           } else {
//             this.value.due = DateTime.fromJSDate(this.value.due, {zone: this.settings.instance_timezone}).set({ hour, minute }).toJSDate()
//           }
//         } else {
//           if (!this.value.multidate) {
//             this.value.due = null
//           } else {
//             this.value.due = DateTime.fromJSDate(this.value.due, {zone: this.settings.instance_timezone}).set({ hour: 23, minute:59 }).toJSDate()
//           }
//         }
//         this.$emit('input', { ...this.value, dueHour: value })

//         // change date in calendar (could be a range or a recurrent event...)
//       } else if (what === 'date') {
//         if (value === null) {
//           this.$emit('input', { ...this.value, from: null, due: null, fromHour: null, dueHour: null })
//           return
//         }
//         if (this.value.multidate) {
//           let from = value.start
//           let due = value.end
//           this.$emit('input', { ...this.value, from, due })
//         } else {
//           let from = value
//           let due = this.value.due
//           // recalculated end date
//           if (this.value.from) {
//             let newDueDate = new Date(value).toDateString()
//             if (this.value.dueHour < this.value.fromHour) {
//               newDueDate = new Date(DateTime.fromJSDate(from, {zone: this.settings.instance_timezone}).plus({day: 1}).toJSDate()).toDateString()
//             }
//             due = new Date(newDueDate + " " + this.value.dueHour)
//           }
//           this.$emit('input', { ...this.value, from, due })
//         }
//       }
//     },
//   }
// } -->
</template>

<style>
.datePicker {
  max-width: 500px !important;
  margin: 0 auto;
}

/* in chrome the input type time adds an icon by default, remove it to make it the same for each browser */
input[type="time"]::-webkit-calendar-picker-indicator {
  display: none;
  -webkit-appearance: none;
}
</style>
