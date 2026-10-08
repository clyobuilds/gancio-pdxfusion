// Favorite events are remembered in this browser only (localStorage): no account needed.
const STORAGE_KEY = 'pdxFavorites'

export function useFavorites() {
  const ids = useState<number[]>('favorites', () => [])
  const loaded = useState<boolean>('favoritesLoaded', () => false)

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.value))
    } catch {
      // storage blocked (private window, ...): favorites then last until the page is closed
    }
  }

  function read() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      ids.value = Array.isArray(stored) ? stored.filter(n => Number.isInteger(n)) : []
    } catch {
      ids.value = []
    }
  }

  // read once the page is in the browser (the server does not know them), and follow changes made in other tabs
  onMounted(() => {
    if (loaded.value) return
    loaded.value = true
    read()
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) read()
    })
  })

  const isFavorite = (id?: number) => id !== undefined && ids.value.includes(id)

  function toggleFavorite(id?: number) {
    if (id === undefined) return
    ids.value = ids.value.includes(id) ? ids.value.filter(i => i !== id) : [...ids.value, id]
    save()
  }

  return { favorites: ids, isFavorite, toggleFavorite }
}
