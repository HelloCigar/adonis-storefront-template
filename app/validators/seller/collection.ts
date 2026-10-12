import vine from '@vinejs/vine'

import { handle, description } from '#validators/seller/rules'

export const collectionCreateValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  handle: handle('collections'),
  description: description(),
  published: vine.boolean(),
  productIds: vine.array(vine.string().ulid().exists({ table: 'products', column: 'id' })),
})
export const collectionUpdateValidator = vine.create(collectionCreateValidator.schema.clone())
