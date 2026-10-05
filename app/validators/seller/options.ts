import vine from '@vinejs/vine'

export const optionsUpdateValidator = vine.create({
  optionDefinitions: vine
    .array(
      vine.object({
        name: vine.string().trim().minLength(1).maxLength(100),
        values: vine
          .array(vine.string().trim().minLength(1).maxLength(100))
          .minLength(1)
          .maxLength(100),
      })
    )
    .maxLength(3),
})
