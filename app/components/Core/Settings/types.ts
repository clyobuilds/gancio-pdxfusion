export type SettingsMenuItem = SettingsMenuItemEntry | SettingsMenuItemDivider

export interface SettingsMenuItemEntry {
  title: string
  value: string
  icon: string
  badge?: string | number | null
  type?: string
}

export interface SettingsMenuItemDivider {
  type: 'divider'
}
