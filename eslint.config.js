import { configApp } from '@adonisjs/eslint-config'
import { vue } from '@adonisjs/eslint-config/vue'

export default configApp(
  {
    name: 'project ignores',
    ignores: ['ref/**', 'database/schema.ts'],
  },
  ...vue,
  {
    name: 'inertia-vue ts overrides',
    files: ['inertia/**/*.ts'],
    rules: {
      'vue/component-api-style': 'off',
    },
  },
  {
    name: 'inertia filename overrides',
    files: ['inertia/**/*'],
    rules: {
      '@unicorn/filename-case': 'off',
    },
  }
)
