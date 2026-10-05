import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    products: {
      columns: {
        option_definitions: {
          tsType: '{ name: string; values: string[] }[]',
          decorators: [{ name: '@column' }],
        },
      },
    },
  },
} satisfies SchemaRules
