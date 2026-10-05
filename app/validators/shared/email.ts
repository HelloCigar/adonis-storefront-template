import vine from '@vinejs/vine'

/** Account and order emails are stored trimmed and lowercase so lookups are case-insensitive. */
export const emailAddress = () => vine.string().trim().toLowerCase().email().maxLength(254)
