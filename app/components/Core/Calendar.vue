<script setup>
const time = useTime()
const selectedDate = useState('selectedDate')
const { attributes, params } = useEvents()

const { theme } = useAppTheme()

function updatePages (pages) {
  const start = pages?.[0] ?? pages
  const tmpStart = time.startMonth(start.year, start.month)
  if (tmpStart != params.value.start) {
    params.value.start = tmpStart
    if (selectedDate.value) {
      selectedDate.value = null
    }
  }
}
const initialPage = useInitialCalendarPage()

// jump back to the current month, forgetting the selected date
const picker = ref()
function goToToday() {
  selectedDate.value = null
  picker.value?.move(new Date())
}
</script>
<template>
<!-- :first-day-of-week='settings.calendar_first_day_of_week ?? undefined' -->
<!-- :columns="$vuetify.display?.smAndUp ? 2 : 1" -->
<DatePicker
  ref='picker'
  v-model='selectedDate'
  :locale='$i18n.locale'
  title-position='left'
  transition='fade'
  :is-dark="theme.current?.value?.dark"
  class="bg-transparent-semi"
  aria-label='Calendar'
  expanded
  :attributes='attributes'
  :initial-page="initialPage"
  @update:pages="updatePages"
>
  <template #footer>
    <div class="d-flex justify-end px-2 pb-1">
      <v-btn size="small" variant="text" color="primary" prepend-icon="mdi-calendar-today" @click="goToToday">
        {{ $t('common.today') }}
      </v-btn>
    </div>
  </template>
</DatePicker>
</template>

<style>
.v-theme--light .vc-container {
  --vc-border: #ccc !important;
  --vc-rounded-lg: 4px !important;
  --vc-bg: rgba(250,250,250,0.5);
  /* --vc-color: var(vc--gray-900) !important; */
}

.v-theme--dark .vc-container {
  --vc-border: #333 !important;
  --vc-rounded-lg: 4px !important;
  --vc-bg: rgba(10,10,10,0.5);
  /* --vc-color: #999 !important; */
}

.vc-opacity-0 {
  opacity: 0.3 !important;
}

.past-event {
  opacity: 0.3;
}

#calendarButton {
  margin-top: -6px;
  margin-left: -10px;
}
</style>
