import DashboardLayout from './admin.vue'
import SettingsLayout from './settings.vue'
import StorefrontLayout from './default.vue'

const dashboardPages = new Set(['inbox'])

export function resolveLayout(name: string) {
  if (
    name === 'index' ||
    /^(account|collection|collections|product|pages|policies|blog)\//.test(name)
  ) {
    return StorefrontLayout
  }

  if (name.startsWith('settings/')) {
    return [DashboardLayout, SettingsLayout]
  }

  if (dashboardPages.has(name) || name.startsWith('seller/')) {
    return DashboardLayout
  }
}
