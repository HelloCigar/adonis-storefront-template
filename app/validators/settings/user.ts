import vine from '@vinejs/vine'
import { emailAddress } from '#validators/shared/email'
import { newPassword } from '#validators/shared/password'

export const updateProfileValidator = vine.withMetaData<{ userId: string }>().create({
  fullName: vine.string().trim().minLength(2).maxLength(100),
  email: emailAddress().unique({
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
  password: newPassword(),
  passwordConfirmation: vine.string().sameAs('password'),
})
