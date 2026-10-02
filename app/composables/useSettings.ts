// export function manageSetting(key: keyof Settings, setCb = null) {
//   const settings = useState<Settings>('settings')
//   return computed({
//     get: () =>  settings.value[key],
//     set: (value) => {
//       $fetch('/api/settings', { method: 'PUT', body: { key, value } })
//       if (typeof setCb === 'function') { setCb(value) }
//       settings.value[key] = value
//     }
//   })
// }

// export const useSettings = (refresh = false) => {
//   const settings = useState('settings', () => [])

//   // Only fetch if not already fetched or if refresh
//   if (!settings.value || refresh) {
//     $fetch('/api/settings').then(r => settings.value =  r)
//   }

//   return settings
// }

// //   const Settings = useState<KeyValueType>('settings', () => reactive({ }))

// //   const loadSettings = async () => {
// //     Settings.value = await $fetch('/api/settings')
// //   }

// //   const saveSetting = async (key: string, value: string) => {
// //     Settings.value[key] = value
// //     await $fetch(`/api/settings`, { method: 'PUT', body: { key, value } })
// //   }

// //   return { Settings, saveSetting, loadSettings }
// // }
