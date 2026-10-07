import vine from '@vinejs/vine'
import { userRoles } from '#models/account/user'
import { emailAddress } from '#validators/shared/email'
import { newPassword } from '#validators/shared/password'

const userFields = {
  fullName: vine.string().trim().minLength(1).maxLength(255),
  email: emailAddress().unique({
    table: 'users',
    column: 'email',
    filter: (query, _value, field) => {
      if (field.meta.id) query.whereNot('id', field.meta.id)
    },
  }),
  role: vine.enum(userRoles),
}
export const userCreateValidator = vine.create({
  ...userFields,
  password: newPassword(),
})
export const userUpdateValidator = vine.withMetaData<{ id: number }>().create({ ...userFields })
