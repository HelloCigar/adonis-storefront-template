import vine from '@vinejs/vine'

export const updateShoppingAssistantSettingValidator = vine.create({
  enabled: vine.boolean(),
})
