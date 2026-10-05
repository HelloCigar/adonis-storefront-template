import vine from '@vinejs/vine'
import { emailAddress } from '#validators/shared/email'

const password = () => vine.string().minLength(8).maxLength(32)

export const loginValidator = vine.create({
  email: emailAddress(),
  password: vine.string(),
})

export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: emailAddress().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: vine.string().sameAs('password'),
})
