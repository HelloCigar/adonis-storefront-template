import { createHash } from 'node:crypto'
import { BaseSchema } from '@adonisjs/lucid/schema'

/** Normalize definitions only; legacy variant tuples remain unchanged for explicit repair. */
export function inferLegacyOptionDefinitions(variants: { options: unknown }[]) {
  const definitions = new Map<string, { name: string; values: Map<string, string> }>()
  for (const variant of variants) {
    let options: unknown = variant.options
    try {
      if (typeof options === 'string') options = JSON.parse(options)
    } catch {
      continue
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) continue
    for (const [rawName, rawValue] of Object.entries(options)) {
      if (typeof rawValue !== 'string') continue
      const name = rawName.trim()
      const value = rawValue.trim()
      if (!name || !value) continue
      const key = name.toLowerCase()
      const definition = definitions.get(key) ?? { name, values: new Map<string, string>() }
      if (!definition.values.has(value.toLowerCase()))
        definition.values.set(value.toLowerCase(), value)
      definitions.set(key, definition)
    }
  }
  return [...definitions.values()].map(({ name, values }) => ({
    name,
    values: [...values.values()],
  }))
}

/** Preserve legacy rows; duplicate combinations intentionally retain a null key. */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('products', (table) => {
      table.text('option_definitions').notNullable().defaultTo('[]')
    })
    this.schema.alterTable('product_variants', (table) => {
      table.string('option_combination_key', 64).nullable()
      table.unique(['product_id', 'option_combination_key'])
    })
    this.defer(async (db) => {
      const products = await db.from('products').select('id')
      for (const product of products) {
        const variants = await db
          .from('product_variants')
          .where('product_id', product.id)
          .orderBy('position')
          .orderBy('id')
        const seen = new Set<string>()
        for (const variant of variants) {
          let options: unknown = variant.options
          try {
            if (typeof options === 'string') options = JSON.parse(options)
          } catch {
            continue
          }
          if (options === null) options = {}
          if (!options || typeof options !== 'object' || Array.isArray(options)) continue
          const entries = Object.entries(options)
          if (
            entries.some(
              ([name, value]) => !name.trim() || typeof value !== 'string' || !value.trim()
            )
          )
            continue
          const key = createHash('sha256')
            .update(
              JSON.stringify(
                entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
              )
            )
            .digest('hex')
          if (seen.has(key)) continue
          seen.add(key)
          await db
            .from('product_variants')
            .where('id', variant.id)
            .update({ option_combination_key: key })
        }
        await db
          .from('products')
          .where('id', product.id)
          .update({
            option_definitions: JSON.stringify(inferLegacyOptionDefinitions(variants)),
          })
      }
    })
  }

  async down() {
    this.schema.alterTable('product_variants', (table) => {
      table.dropUnique(['product_id', 'option_combination_key'])
      table.dropColumn('option_combination_key')
    })
    this.schema.alterTable('products', (table) => {
      table.dropColumn('option_definitions')
    })
  }
}
