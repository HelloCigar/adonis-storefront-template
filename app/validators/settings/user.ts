import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const updateProfileValidator = vine.withMetaData<{ userId: number }>().create({
  fullName: vine.string().trim().minLength(2).maxLength(100),
  email: email().unique({
    table: 'users',
    column: 'email',
    filter: (db, _value, field) => {
      db.whereNot('id', field.meta.userId)
    },
  }),
  avatar: vine.file({ size: '1mb', extnames: ['jpg', 'jpeg', 'png', 'gif'] }).optional(),
})

export const updatePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: vine.string().sameAs('password'),
})
