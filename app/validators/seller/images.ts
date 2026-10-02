import vine from '@vinejs/vine'

export const productImagesValidator = vine.create({
  images: vine
    .array(vine.file({ size: '5mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }))
    .minLength(1)
    .maxLength(10),
})
