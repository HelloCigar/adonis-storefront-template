import vine from '@vinejs/vine'

/** One password policy for signup, password changes, and staff-created accounts. */
export const newPassword = () => vine.string().minLength(8).maxLength(128)
