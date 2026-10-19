import vine from '@vinejs/vine'

export const updateDashboardCopilotSettingValidator = vine.create({
  enabled: vine.boolean(),
})
