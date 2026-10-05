import vine from '@vinejs/vine'
import { userRoles } from '#models/account/user'
import { emailAddress } from '#validators/shared/email'

const userFields = {
  fullName: vine.string().trim().minLength(1).maxLength(255),
  email: emailAddress().unique(async (db, value, field) => {
    const query = db.from('users').where('email', value)
    if (field.meta.id) query.whereNot('id', field.meta.id)
    return !(await query.first())
  }),
  role: vine.enum(userRoles),
}
export const userCreateValidator = vine.create({
  ...userFields,
  password: vine.string().minLength(8).maxLength(128),
})
export const userUpdateValidator = vine.create({ ...userFields })
