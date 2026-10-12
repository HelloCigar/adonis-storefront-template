import { definePasswordPolicy } from '@adonisplus/persona/password_policy'

/** The password rules shared by the validators and the signup strength meter. */
export const passwordPolicy = definePasswordPolicy({
  minLength: 8,
  maxLength: 32,
})
