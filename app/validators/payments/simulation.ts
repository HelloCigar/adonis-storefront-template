import vine from '@vinejs/vine'

const minor = vine.number({ strict: true }).withoutDecimals().min(1).max(Number.MAX_SAFE_INTEGER)
const key = vine.string().minLength(1).maxLength(255)
const httpUrl = vine
  .string()
  .url({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })

export const simulatedCheckoutValidator = vine.create({
  reference: vine.string().minLength(1),
  currency: vine.literal('PHP'),
  items: vine
    .array(
      vine.object({
        name: vine.string().minLength(1),
        unitAmount: minor.clone(),
        quantity: minor.clone(),
        description: vine.string().optional(),
        imageUrl: httpUrl.clone().optional(),
      })
    )
    .minLength(1),
  successUrl: httpUrl.clone(),
  cancelUrl: httpUrl.clone(),
  customer: vine
    .object({
      name: vine.string().optional(),
      email: vine.string().email().optional(),
      phone: vine.string().optional(),
    })
    .optional(),
  metadata: vine.record(vine.string()).optional(),
  idempotencyKey: key.clone(),
})

export const simulatedRefundValidator = vine.create({
  paymentId: vine.string().minLength(1),
  amount: minor.clone(),
  currency: vine.literal('PHP'),
  reason: vine.enum(['duplicate', 'fraudulent', 'requested_by_customer']),
  notes: vine.string().optional(),
  idempotencyKey: key.clone(),
})

export const simulationValidator = vine.create({
  outcome: vine.enum(['paid', 'failed', 'expired', 'paid_without_notification']),
})
