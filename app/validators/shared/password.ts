import vine from '@vinejs/vine'
import { passwordPolicy } from '#validators/shared/password_policy'

/** One password policy for signup, password changes, and staff-created accounts. */
export const newPassword = () => vine.string().passwordPolicy(passwordPolicy)
