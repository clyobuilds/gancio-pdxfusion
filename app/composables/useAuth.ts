export default () => {
  const { user } = useUserSession()
  const isAdmin = computed(() => (user.value?.role === 'admin'))

  const isEditorOrAdmin = computed(() => (user.value?.role === 'admin' || user.value?.role === 'editor'))

  return {
    isAdmin,
    isEditorOrAdmin
  }
}
