import { computed, ref } from 'vue'

// Add supported locales here without depending on a commerce provider.
const locale = ref('en-PH')
export const useLocalization = () => ({
  locale,
  language: computed(() => locale.value.split('-')[0]!),
  country: computed(() => locale.value.split('-')[1]!),
})
export const useLocaleSelect = () => ({
  countries: [
    {
      code: 'PH',
      label: 'Philippines',
      flag: '🇵🇭',
      currency: 'PHP ₱',
      active: true,
      locale: 'en-PH',
    },
  ],
  languages: [{ code: 'en', label: 'English', active: true, locale: 'en-PH' }],
  select: (value: string) => {
    locale.value = value
  },
})
export const useCountries = () =>
  ['PH', 'US', 'GB', 'CA', 'AU', 'NZ', 'SG', 'JP', 'DE', 'FR', 'IN'].map((value) => ({
    value,
    label: new Intl.DisplayNames(['en'], { type: 'region' }).of(value) ?? value,
  }))
