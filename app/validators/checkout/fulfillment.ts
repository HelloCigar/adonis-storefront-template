import vine from '@vinejs/vine'

export const shipmentValidator = vine.create({
  carrier: vine.string().trim().minLength(2).maxLength(100),
  trackingNumber: vine.string().trim().minLength(2).maxLength(255),
  trackingUrl: vine
    .string()
    .trim()
    .url({ protocols: ['http', 'https'], require_protocol: true })
    .maxLength(2048)
    .optional(),
})
export const refundValidator = vine.create({
  paymentId: vine.string().ulid().optional(),
})
export const operationRetryValidator = vine.create({
  kind: vine.enum(['payment', 'refund', 'notification']),
  operationId: vine.string().ulid(),
  externalId: vine.string().trim().maxLength(255).optional(),
})
