import vine from '@vinejs/vine'

// Tool inputs the model fills in. Passed to the ai SDK as Standard Schema (with JSON Schema).
export const searchProductsInput = vine.create({
  query: vine.string().trim().minLength(1).maxLength(200),
  collection: vine.string().trim().maxLength(255).optional(),
})

export const offerSuggestionsInput = vine.create({})

export const listMyOrdersInput = vine.create({})

export const getMyOrderInput = vine.create({
  orderNumber: vine.string().trim().maxLength(40),
})

export const proposeAddToCartInput = vine.create({
  variantId: vine.string().ulid(),
  quantity: vine.number().withoutDecimals().range([1, 10]),
})

// Server-side values a tool needs, passed through the ai SDK's toolsContext, never the prompt.
export const shopperContext = vine.create({
  shopperId: vine.string().nullable(),
})

export const conversationContext = vine.create({
  conversationId: vine.string(),
})
