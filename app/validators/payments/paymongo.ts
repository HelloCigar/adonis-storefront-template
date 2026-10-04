import vine from '@vinejs/vine'

// Provider amounts and modes must retain their JSON types, without form coercion.
const amount = vine.number({ strict: true }).withoutDecimals().min(1).max(Number.MAX_SAFE_INTEGER)
const httpUrl = vine
  .string()
  .url({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
const idempotencyKey = vine
  .string()
  .minLength(1)
  .maxLength(255)
  .regex(/^[\x21-\x7E]+$/)
const checkoutId = vine.string().regex(/^cs_[a-zA-Z0-9_-]+$/)
const paymentId = vine.string().regex(/^pay_[a-zA-Z0-9_-]+$/)
const metadata = vine.record(vine.string())

export const checkoutInputValidator = vine.create({
  reference: vine.string().trim().minLength(1),
  currency: vine.literal('PHP'),
  items: vine
    .array(
      vine.object({
        name: vine.string().trim().minLength(1),
        unitAmount: amount.clone(),
        quantity: amount.clone(),
        description: vine.string().optional(),
        imageUrl: httpUrl.clone().optional(),
      })
    )
    .minLength(1)
    .maxLength(999),
  successUrl: httpUrl.clone(),
  cancelUrl: httpUrl.clone(),
  customer: vine
    .object({
      name: vine.string().trim().minLength(1).optional(),
      email: vine.string().email().optional(),
      phone: vine.string().trim().minLength(1).optional(),
    })
    .optional(),
  metadata: metadata
    .clone()
    .validateKeys((keys, field) => {
      if (keys.some((key) => key.startsWith('PYM_'))) {
        field.report('Reserved payment metadata key', 'reservedMetadata', field)
      }
    })
    .optional(),
  idempotencyKey: idempotencyKey.clone(),
})

export const checkoutIdValidator = vine.create({ id: checkoutId.clone() })
export const refundIdValidator = vine.create({ id: vine.string().regex(/^ref_[a-zA-Z0-9_-]+$/) })
export const paymentIdValidator = vine.create({ id: paymentId.clone() })
export const checkoutExpiryValidator = vine.create({
  id: checkoutId.clone(),
  idempotencyKey: idempotencyKey.clone(),
})

export const refundInputValidator = vine.create({
  paymentId: paymentId.clone(),
  amount: amount.clone().min(100),
  currency: vine.literal('PHP'),
  reason: vine.enum(['duplicate', 'fraudulent', 'requested_by_customer']),
  notes: vine.string().optional(),
  idempotencyKey: idempotencyKey.clone(),
})

export const checkoutResponseValidator = vine.create({
  id: checkoutId.clone(),
  type: vine.literal('checkout_session'),
  attributes: vine.object({
    checkout_url: httpUrl.clone(),
    reference_number: vine.string().nullable().optional(),
    status: vine.enum(['active', 'expired']).optional(),
    livemode: vine.boolean({ strict: true }),
    metadata: metadata.clone().nullable().optional(),
    payments: vine
      .array(
        vine.object({
          id: paymentId.clone(),
          type: vine.literal('payment'),
          attributes: vine.object({
            amount: amount.clone(),
            currency: vine.literal('PHP'),
            status: vine.enum(['pending', 'paid', 'failed']),
            livemode: vine.boolean({ strict: true }).optional(),
          }),
        })
      )
      .optional(),
  }),
})

export const refundResponseValidator = vine.create({
  id: vine.string().regex(/^ref_[a-zA-Z0-9_-]+$/),
  type: vine.literal('refund'),
  attributes: vine.object({
    payment_id: paymentId.clone(),
    amount: amount.clone(),
    currency: vine.literal('PHP').optional(),
    status: vine.enum(['pending', 'processing', 'succeeded', 'failed']),
    livemode: vine.boolean({ strict: true }).optional(),
  }),
})

// PayMongo documents both the original event resource and the newer envelope.
export const webhookEnvelopeValidator = vine.create({
  data: vine.union([
    vine.union.if(
      (value) => vine.helpers.isObject(value) && value.type === 'event',
      vine.object({
        id: vine.string().minLength(1).optional(),
        type: vine.literal('event'),
        attributes: vine.object({
          type: vine.string().minLength(1),
          livemode: vine.boolean({ strict: true }),
          data: vine.any(),
        }),
      })
    ),
    vine.union.else(
      vine.object({
        id: vine.string().minLength(1).optional(),
        type: vine.string().minLength(1),
        livemode: vine.boolean({ strict: true }),
        data: vine.any(),
      })
    ),
  ]),
})

export const apiEnvelopeValidator = vine.create({ data: vine.any() })
