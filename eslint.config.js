import { configApp } from '@adonisjs/eslint-config'
import { vue } from '@adonisjs/eslint-config/vue'
import { astGrep } from '@adonisjs/eslint-ast-grep'

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
  },
  {
    name: 'formatting runs through prettier --check',
    rules: {
      'prettier/prettier': 'off',
    },
  },
  ...astGrep('@adonisplus/flow/rules')
)
