import vine from '@vinejs/vine'

/**
 * Only the given schemes, plus same-site paths and fragments. Anything else, such as
 * `javascript:` or `data:`, fails. Control characters and whitespace are stripped before the
 * scheme check because browsers ignore them inside a scheme.
 */
const safeUrl = vine.createRule<{ schemes: string[] }>((value, { schemes }, field) => {
  if (typeof value !== 'string') return
  const compact = [...value]
    .filter((char) => {
      const code = char.codePointAt(0)!
      return code > 0x20 && (code < 0x7f || code > 0x9f)
    })
    .join('')
  if (compact.startsWith('/') || compact.startsWith('#')) return
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase()
  if (!scheme || !schemes.includes(scheme))
    field.report('The {{ field }} field must be a safe link', 'safeUrl', field)
})

const url = (schemes: string[]) =>
  vine.string().trim().minLength(1).maxLength(2048).use(safeUrl({ schemes }))
const label = () => vine.string().trim().minLength(1).maxLength(500)

/**
 * Attribute rules for the Tiptap nodes and marks that RichTextService keeps. Each attribute is
 * validated on its own, so one bad attribute falls back to its default instead of failing the
 * whole node.
 */
export const richTextAttributes = {
  headingLevel: vine.create(vine.number().withoutDecimals().range([1, 6])),
  listStart: vine.create(vine.number().withoutDecimals().range([2, 999_999])),
  codeLanguage: vine.create(
    vine
      .string()
      .trim()
      .maxLength(40)
      .regex(/^[\w+#.-]+$/)
  ),
  imageSrc: vine.create(url(['http', 'https'])),
  imageAlt: vine.create(label()),
  imageTitle: vine.create(label()),
  linkHref: vine.create(url(['http', 'https', 'mailto', 'tel'])),
}
