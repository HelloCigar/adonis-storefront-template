export type RichTextMark = { type: string; attrs?: Record<string, unknown> }
export type RichTextNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: RichTextNode[]
  marks?: RichTextMark[]
  text?: string
}
export type RichTextDocument = RichTextNode & { type: 'doc'; content: RichTextNode[] }

/** Nesting deeper than this is not something the editor produces. */
const MAX_DEPTH = 40

const BLOCK_TAGS: Record<string, string> = {
  paragraph: 'p',
  blockquote: 'blockquote',
  bulletList: 'ul',
  orderedList: 'ol',
  listItem: 'li',
}
const MARK_TAGS: Record<string, string> = {
  bold: 'strong',
  italic: 'em',
  strike: 's',
  underline: 'u',
  code: 'code',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringAttr(attrs: unknown, key: string, maxLength = 2048) {
  if (!isRecord(attrs) || typeof attrs[key] !== 'string') return null
  const value = attrs[key].trim()
  return value && value.length <= maxLength ? value : null
}

/**
 * Only web, mail, and phone links, plus same-site paths and fragments. Anything else, such as
 * `javascript:` or `data:`, is dropped. Control characters and whitespace are stripped before
 * the scheme check because browsers ignore them inside a scheme.
 */
function safeUrl(value: string | null, schemes: string[]) {
  if (!value) return null
  const compact = value.replace(/[\u0000- \u007f-\u009f]/g, '')
  if (compact.startsWith('/') || compact.startsWith('#')) return value
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase()
  return scheme && schemes.includes(scheme) ? value : null
}

/**
 * Normalizes and renders the Tiptap JSON that the Nuxt UI editor produces. The server never
 * trusts editor HTML: it keeps only the nodes, marks, and attributes below from the submitted
 * JSON and renders HTML from that, so public pages can show `content_html` as-is.
 */
export default class RichTextService {
  static emptyDocument(): RichTextDocument {
    return { type: 'doc', content: [] }
  }

  normalize(input: unknown): RichTextDocument {
    if (!isRecord(input) || input.type !== 'doc') return RichTextService.emptyDocument()
    return { type: 'doc', content: this.#children(input.content, 0) }
  }

  toHtml(document: RichTextDocument) {
    return this.#renderChildren(document.content)
  }

  /** Visible text with blocks separated by spaces, for emptiness checks and summaries. */
  toText(document: RichTextNode): string {
    if (document.type === 'text') return document.text ?? ''
    const parts = (document.content ?? []).map((child) => this.toText(child))
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }

  /** Whether the document has anything a reader would see. */
  hasContent(document: RichTextDocument) {
    const visible = (node: RichTextNode): boolean =>
      node.type === 'image' ||
      node.type === 'horizontalRule' ||
      (node.type === 'text' && !!node.text?.trim()) ||
      (node.content ?? []).some(visible)
    return visible(document)
  }

  #children(content: unknown, depth: number): RichTextNode[] {
    if (!Array.isArray(content) || depth > MAX_DEPTH) return []
    return content.flatMap((child) => {
      const node = this.#node(child, depth + 1)
      return node ? [node] : []
    })
  }

  #node(input: unknown, depth: number): RichTextNode | null {
    if (!isRecord(input) || typeof input.type !== 'string') return null
    const { type, attrs } = input
    switch (type) {
      case 'text': {
        if (typeof input.text !== 'string' || input.text === '') return null
        const marks = this.#marks(input.marks)
        return marks.length ? { type, text: input.text, marks } : { type, text: input.text }
      }
      case 'paragraph':
      case 'blockquote':
      case 'bulletList':
      case 'listItem':
        return { type, content: this.#children(input.content, depth) }
      case 'orderedList': {
        const start = isRecord(attrs) ? Number(attrs.start) : 1
        const node: RichTextNode = { type, content: this.#children(input.content, depth) }
        if (Number.isInteger(start) && start > 1 && start < 1_000_000) node.attrs = { start }
        return node
      }
      case 'heading': {
        const level = isRecord(attrs) ? Number(attrs.level) : NaN
        return {
          type,
          attrs: { level: Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2 },
          content: this.#children(input.content, depth),
        }
      }
      case 'codeBlock': {
        const language = stringAttr(attrs, 'language', 40)
        const node: RichTextNode = {
          type,
          content: this.#children(input.content, depth)
            .filter((child) => child.type === 'text')
            .map((child) => ({ type: 'text', text: child.text })),
        }
        if (language && /^[\w+#.-]+$/.test(language)) node.attrs = { language }
        return node
      }
      case 'hardBreak':
      case 'horizontalRule':
        return { type }
      case 'image': {
        const src = safeUrl(stringAttr(attrs, 'src'), ['http', 'https'])
        if (!src) return null
        const node: RichTextNode = { type, attrs: { src } }
        const alt = stringAttr(attrs, 'alt', 500)
        const title = stringAttr(attrs, 'title', 500)
        if (alt) node.attrs!.alt = alt
        if (title) node.attrs!.title = title
        return node
      }
      default:
        return null
    }
  }

  #marks(input: unknown): RichTextMark[] {
    if (!Array.isArray(input)) return []
    const marks: RichTextMark[] = []
    for (const mark of input) {
      if (!isRecord(mark) || typeof mark.type !== 'string') continue
      if (marks.some((existing) => existing.type === mark.type)) continue
      if (mark.type in MARK_TAGS) {
        marks.push({ type: mark.type })
      } else if (mark.type === 'link') {
        const href = safeUrl(stringAttr(mark.attrs, 'href'), ['http', 'https', 'mailto', 'tel'])
        if (href) marks.push({ type: 'link', attrs: { href } })
      }
    }
    return marks
  }

  #renderChildren(content: RichTextNode[] | undefined) {
    return (content ?? []).map((child) => this.#render(child)).join('')
  }

  #render(node: RichTextNode): string {
    const inner = () => this.#renderChildren(node.content)
    switch (node.type) {
      case 'text':
        return this.#renderText(node)
      case 'heading':
        return `<h${node.attrs!.level}>${inner()}</h${node.attrs!.level}>`
      case 'orderedList':
        return node.attrs?.start
          ? `<ol start="${node.attrs.start}">${inner()}</ol>`
          : `<ol>${inner()}</ol>`
      case 'codeBlock': {
        const language = node.attrs?.language
        const open = language ? `<code class="language-${escapeHtml(String(language))}">` : '<code>'
        return `<pre>${open}${inner()}</code></pre>`
      }
      case 'hardBreak':
        return '<br>'
      case 'horizontalRule':
        return '<hr>'
      case 'image': {
        const attrs = node.attrs!
        const alt = ` alt="${escapeHtml(String(attrs.alt ?? ''))}"`
        const title = attrs.title ? ` title="${escapeHtml(String(attrs.title))}"` : ''
        return `<img src="${escapeHtml(String(attrs.src))}"${alt}${title} loading="lazy">`
      }
      default: {
        const tag = BLOCK_TAGS[node.type]
        return tag ? `<${tag}>${inner()}</${tag}>` : ''
      }
    }
  }

  /** The first mark wraps outermost, matching the order Tiptap stores them in. */
  #renderText(node: RichTextNode) {
    let html = escapeHtml(node.text ?? '')
    for (const mark of [...(node.marks ?? [])].reverse()) {
      if (mark.type === 'link') {
        const href = escapeHtml(String(mark.attrs!.href))
        html = `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${html}</a>`
      } else {
        const tag = MARK_TAGS[mark.type]
        html = `<${tag}>${html}</${tag}>`
      }
    }
    return html
  }
}
