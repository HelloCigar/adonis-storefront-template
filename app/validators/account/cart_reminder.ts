import vine from '@vinejs/vine'

export const updateCartReminderValidator = vine.create({
  enabled: vine.boolean(),
})
