import vine from '@vinejs/vine'

import { description } from '#validators/seller/rules'

export const orderUpdateValidator = vine.create({
  financialStatus: vine.enum([
    'pending',
    'authorized',
    'paid',
    'partially_refunded',
    'refunded',
    'voided',
  ]),
  fulfillmentStatus: vine.enum(['unfulfilled', 'partial', 'fulfilled']),
  note: description(),
})
