import vine from '@vinejs/vine'

/** Largest document accepted, so one document cannot bloat every page that renders it. */
export const MAX_RICH_TEXT_LENGTH = 512 * 1024

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/** A Tiptap JSON document sent as a string; RichTextService keeps only what it can render. */
export const richTextDocument = vine.createRule((value, _options, field) => {
  const document = typeof value === 'string' ? parseJson(value) : undefined
  if (
    typeof document !== 'object' ||
    document === null ||
    (document as { type?: unknown }).type !== 'doc'
  )
    field.report('The content could not be read', 'tiptapDocument', field)
})
