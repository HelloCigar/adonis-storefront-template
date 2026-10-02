import vine from '@vinejs/vine'

export const handle = (table: string) =>
  vine
    .string()
    .trim()
    .maxLength(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .unique(async (db, value, field) => {
      const query = db.from(table).where('handle', value)
      if (field.meta.id) query.whereNot('id', field.meta.id)
      return !(await query.first())
    })
export const optionalText = () => vine.string().trim().maxLength(255).nullable()
export const description = () => vine.string().trim().maxLength(10000).nullable()
