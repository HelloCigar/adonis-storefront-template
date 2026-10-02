import vine from '@vinejs/vine'

import { handle, optionalText, description } from '#validators/seller/rules'

export const productCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  handle: handle('products'),
  description: description(),
  vendor: optionalText(),
  productType: optionalText(),
  status: vine.enum(['draft', 'active', 'archived']),
})
export const productUpdateValidator = vine.create(productCreateValidator.schema.clone())
