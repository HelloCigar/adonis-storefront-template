import RichTextService from '#services/content/rich_text_service'

const service = new RichTextService()

/** Renders a document made of the given top-level nodes. */
export const render = (...content: unknown[]) =>
  service.toHtml(service.normalize({ type: 'doc', content }))

export const text = (value: string, marks?: unknown[]) => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
})

export const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })

export const linkHtml = (href: string) =>
  render(paragraph(text('l', [{ type: 'link', attrs: { href } }])))

export const imageHtml = (src: string) => render({ type: 'image', attrs: { src } })
