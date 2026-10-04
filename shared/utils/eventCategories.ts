// The kinds of event PDX Fusion lists. Each is stored as an ordinary tag on the event; an event can have several.
export const EVENT_CATEGORIES = ['Social', 'Lesson', 'Workshop'] as const

export function categoriesOf(tags?: string[] | null) {
  return EVENT_CATEGORIES.filter(c => tags?.some(t => t.toLowerCase() === c.toLowerCase()))
}
