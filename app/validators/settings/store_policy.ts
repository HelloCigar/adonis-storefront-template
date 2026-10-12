import vine from '@vinejs/vine'
import { MAX_RICH_TEXT_LENGTH, richTextDocument } from '#validators/shared/rich_text'

/** One policy's editor document, sent as a JSON string like blog post content. */
const content = () =>
  vine
    .string()
    .maxLength(MAX_RICH_TEXT_LENGTH)
    .use(richTextDocument())
    .transform((value) => JSON.parse(value) as unknown)

export const storePoliciesValidator = vine.create({
  policies: vine.object({
    'refund-policy': content(),
    'shipping-policy': content(),
    'privacy-policy': content(),
    'terms-of-service': content(),
  }),
})
