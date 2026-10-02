<script setup lang="ts">
import type { SmtpSettings } from '~~/shared/types/settings'

const settings = useState<Settings>('settings')
const defaultSenderName = computed(() => '📅 ' + settings.value.title)

const loading = ref(false)
const isValid = ref(true)
const hasChanged = ref(false)
const { $notify } = useNuxtApp()

const { data: storedSmtpConfig, refresh } = await useFetch('/api/settings/smtp')
const smtp = ref<SmtpSettings>({ ...storedSmtpConfig.value, auth: {} })

watch(storedSmtpConfig, (newValue) => {
  smtp.value = { ...(newValue || {}), auth: {} }
})

const admin_email = manageSetting('admin_email')

async function done (testing: boolean) {
  const tmpSMTP = JSON.parse(JSON.stringify(smtp.value))
  if (!tmpSMTP.auth.user) {
    delete tmpSMTP.auth
  }

  // override past `ignoreTLS` smtp setting
  tmpSMTP.ignoreTLS = false

  tmpSMTP.port = Number(tmpSMTP.port)
  // force encryption based on selected port, see https://framagit.org/les/gancio/-/issues/192
  if (tmpSMTP.secure) {
    if (tmpSMTP.port === 465) {
      tmpSMTP.secure = true
      tmpSMTP.requireTLS = false
    } else {
      tmpSMTP.secure = false
      tmpSMTP.requireTLS = true
    }
  } else {
    // use TLS immediately for port 465
    // this is recommended in nodemailer documentation
    tmpSMTP.secure = tmpSMTP.port === 465
    tmpSMTP.requireTLS = false
  }

  try {
    loading.value = true
    if (testing) {
      await $fetch('/api/settings/test_smtp', { method: 'POST', body: tmpSMTP })
      $notify('admin.smtp_test_success', Statuses.SUCCESS, { admin_email: admin_email.value })
    } else {
      await $fetch('/api/settings', { method: 'PUT', body: { key: 'smtp', value: tmpSMTP } })
      hasChanged.value = false
      refresh()
    }
  } catch (e) {
    $notify(e, Statuses.ERROR)
  } finally {
    loading.value = false
  }
}

</script>
<template>
<div class="d-flex flex-column ga-2">
  <div class="text-subtitle-2 text-medium-emphasis mt-2" v-html="$t('admin.smtp_description')"/>

  <v-divider class="my-4" />

  <v-form v-model="isValid" @change="hasChanged = true">
    <div>
      <v-row>
        <v-col cols sm="6">
          <v-text-field
            v-model="admin_email"
            :label="$t('admin.admin_email')"
            :hint="$t('admin.admin_email_help')"
            persistent-hint
            :rules="$valid.email" />
        </v-col>

        <v-col cols sm="6">
          <v-text-field
            v-model="smtp.from"
            :label="$t('admin.smtp_from_address')"
            :hint="$t('admin.smtp_from_address_help')"
            :placeholder='defaultSenderName'
            persistent-hint/>
        </v-col>
      </v-row>

      <v-divider class="my-8" />

      <v-row>
        <v-col>
          <div class="text-h5 mb-6">{{ $t('admin.smtp_credentials_title') }}</div>
          <v-switch
            v-model="smtp.sendmail"
            :label="$t('admin.smtp_use_sendmail')"
            hide-details="auto"
          />
        </v-col>
      </v-row>

      <v-row v-if="!smtp.sendmail">
        <v-col cols="12" md="5">
          <v-text-field
            v-model="smtp.host"
            :label="$t('admin.smtp_hostname')"
            :rules="[$valid.required('admin.smtp_hostname')]"
            hide-details="auto"
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-number-input
            v-model="smtp.port"
            :label="$t('admin.smtp_port')"
            :rules="[$valid.required('admin.smtp_port')]"
            :min="0"
            variant="underlined"
            hide-details="auto"
          />
        </v-col>
      </v-row>

      <v-row v-if="!smtp.sendmail">
        <v-col>
          <v-switch
            v-model="smtp.secure"
            :label="$t('admin.smtp_secure')" />
        </v-col>
      </v-row>

      <v-row v-if="!smtp.sendmail && smtp.auth">
        <v-col cols md="6">
          <v-text-field
            v-model="smtp.auth.user"
            :label="$t('common.user')"
            hide-details="auto"
          />
        </v-col>

        <v-col cols md="6">
          <v-text-field
            v-model="smtp.auth.pass"
            persistent-hint
            :hint="$t('admin.smtp_password_description')"
            :label="$t('common.password')"
            type="password"
            autocomplete="new-password"
            hide-details="auto"
          />
        </v-col>
      </v-row>

    </div>
  </v-form>

  <div class="d-flex ga-3 justify-end mt-8">
    <v-btn :loading="loading" :disabled="loading || !isValid" variant="outlined" prepend-icon="mdi-email-search-outline" @click="done(true)">
      {{$t('admin.smtp_test_button')}}
    </v-btn>
    <v-btn color="primary" :loading="loading" :disabled="!hasChanged" @click="done(false)">{{$t("common.save")}}</v-btn>
  </div>
</div>
</template>
