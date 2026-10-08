import vine from '@vinejs/vine'

const pesos = () => vine.number().min(0).decimal([0, 2]).max(100_000_000)

export const discountValidator = vine.create({
  code: vine
    .string()
    .trim()
    .minLength(3)
    .maxLength(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .toUpperCase()
    .unique(async (db, value, field) => {
      const query = db.from('discount_codes').where('code', value)
      if (field.meta.id) query.whereNot('id', field.meta.id)
      return !(await query.first())
    }),
  description: vine.string().trim().maxLength(255).nullable(),
  kind: vine.enum(['percentage', 'fixed']),
  percentOff: vine
    .number()
    .withoutDecimals()
    .range([1, 100])
    .nullable()
    .optional()
    .requiredWhen('kind', '=', 'percentage'),
  amountOff: pesos().positive().nullable().optional().requiredWhen('kind', '=', 'fixed'),
  minimumSubtotal: pesos(),
  usageLimit: vine.number().withoutDecimals().range([1, 1_000_000]).nullable(),
  oncePerCustomer: vine.boolean(),
  active: vine.boolean(),
  startsAt: vine.date({ formats: ['iso8601'] }).nullable(),
  endsAt: vine.date({ formats: ['iso8601'] }).nullable(),
})
