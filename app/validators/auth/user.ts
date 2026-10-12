import vine from '@vinejs/vine'
import { emailAddress } from '#validators/shared/email'
import { newPassword } from '#validators/shared/password'

export const loginValidator = vine.create({
  email: emailAddress(),
  password: vine.string(),
})

export const signupValidator = vine.create({
  fullName: vine.string().nullable(),
  email: emailAddress().unique({ table: 'users', column: 'email' }),
  password: newPassword(),
  passwordConfirmation: vine.string().sameAs('password'),
})

export const forgotPasswordValidator = vine.create({
  email: emailAddress(),
})

export const resetPasswordValidator = vine.create({
  password: newPassword().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
})
