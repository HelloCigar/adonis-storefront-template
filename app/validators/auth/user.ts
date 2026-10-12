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

export const passkeyRegistrationValidator = vine.create({
  response: vine.object({
    id: vine.string().maxLength(1364),
    rawId: vine.string().maxLength(1364),
    type: vine.literal('public-key'),
    response: vine.object({
      clientDataJSON: vine.string(),
      attestationObject: vine.string(),
      transports: vine.array(vine.string()).optional(),
    }),
    clientExtensionResults: vine.object({}),
  }),
})

export const passkeyAuthenticationValidator = vine.create({
  response: vine.object({
    id: vine.string().maxLength(1364),
    rawId: vine.string().maxLength(1364),
    type: vine.literal('public-key'),
    response: vine.object({
      clientDataJSON: vine.string(),
      authenticatorData: vine.string(),
      signature: vine.string(),
      userHandle: vine.string().optional(),
    }),
    clientExtensionResults: vine.object({}),
  }),
})

export const passkeyNameValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(100),
})
