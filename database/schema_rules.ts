import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * SQLite returns booleans as 0/1 and bigint columns as numbers or bigints. These rules make
 * every generated column consume the value its TypeScript type promises, so models only
 * redeclare columns that narrow a type or change behavior.
 *
 * The generator writes decorator arguments with `String(value)`, so `consume` must be an
 * inline arrow function: its source text is copied into database/schema.ts verbatim.
 */
export default {
  types: {
    boolean: {
      tsType: 'boolean',
      decorators: [{ name: '@column', args: { consume: (value: unknown) => Boolean(value) } }],
    },
    bigint: {
      tsType: 'number',
      decorators: [
        {
          name: '@column',
          args: { consume: (value: unknown) => (value === null ? null : Number(value)) },
        },
      ],
    },
  },
  tables: {
    blog_posts: {
      columns: {
        content: {
          tsType: 'Record<string, unknown>',
          decorators: [{ name: '@column' }],
        },
      },
    },
    store_policies: {
      columns: {
        content: {
          tsType: 'Record<string, unknown>',
          decorators: [{ name: '@column' }],
        },
      },
    },
    assistant_messages: {
      columns: {
        // JSON text holding AI SDK UI message parts; the model narrows and parses it.
        parts: {
          tsType: 'unknown[]',
          decorators: [{ name: '@column' }],
        },
      },
    },
    copilot_proposal_items: {
      columns: {
        // Changed field → raw value; the model parses the JSON text.
        before: {
          tsType: 'Record<string, unknown>',
          decorators: [{ name: '@column' }],
        },
        after: {
          tsType: 'Record<string, unknown>',
          decorators: [{ name: '@column' }],
        },
      },
    },
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
