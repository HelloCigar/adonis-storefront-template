import DashboardLayout from './default.vue'
import SettingsLayout from './settings.vue'

const dashboardPages = new Set(['index', 'inbox', 'customers'])

export function resolveLayout(name: string) {
  if (name.startsWith('settings/')) {
    return [DashboardLayout, SettingsLayout]
  }

  if (dashboardPages.has(name)) {
    return DashboardLayout
  }
}
