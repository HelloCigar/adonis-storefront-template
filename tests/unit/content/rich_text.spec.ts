import { test } from '@japa/runner'
import RichTextService from '#services/content/rich_text_service'

const service = new RichTextService()
const render = async (...content: unknown[]) =>
  service.toHtml(await service.normalize({ type: 'doc', content }))
const text = (value: string, marks?: unknown[]) => ({
  type: 'text',
  text: value,
  ...(marks ? { marks } : {}),
})
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })

test.group('RichTextService blocks', () => {
  test('renders paragraphs, headings, lists, blockquotes and code blocks', async ({ assert }) => {
    assert.equal(await render(paragraph(text('Hello'))), '<p>Hello</p>')
    assert.equal(
      await render({ type: 'heading', attrs: { level: 3 }, content: [text('Title')] }),
      '<h3>Title</h3>'
    )
    assert.equal(
      await render({
        type: 'bulletList',
        content: [{ type: 'listItem', content: [paragraph(text('One'))] }],
      }),
      '<ul><li><p>One</p></li></ul>'
    )
    assert.equal(
      await render({
        type: 'orderedList',
        content: [{ type: 'listItem', content: [paragraph(text('One'))] }],
      }),
      '<ol><li><p>One</p></li></ol>'
    )
    assert.equal(
      await render({
        type: 'orderedList',
        attrs: { start: 4 },
        content: [{ type: 'listItem', content: [paragraph(text('Four'))] }],
      }),
      '<ol start="4"><li><p>Four</p></li></ol>'
    )
    assert.equal(
      await render({ type: 'blockquote', content: [paragraph(text('Quoted'))] }),
      '<blockquote><p>Quoted</p></blockquote>'
    )
    assert.equal(
      await render({ type: 'codeBlock', attrs: { language: 'ts' }, content: [text('a < b')] }),
      '<pre><code class="language-ts">a &lt; b</code></pre>'
    )
    assert.equal(
      await render({ type: 'codeBlock', content: [text('plain')] }),
      '<pre><code>plain</code></pre>'
    )
  })

  test('renders hard breaks, horizontal rules and images', async ({ assert }) => {
    assert.equal(
      await render(paragraph(text('a'), { type: 'hardBreak' }, text('b'))),
      '<p>a<br>b</p>'
    )
    assert.equal(await render({ type: 'horizontalRule' }), '<hr>')
    assert.equal(
      await render({
        type: 'image',
        attrs: { src: 'https://example.com/a.png', alt: 'A "quoted" alt', title: 'Pic' },
      }),
      '<img src="https://example.com/a.png" alt="A &quot;quoted&quot; alt" title="Pic" loading="lazy">'
    )
    assert.equal(
      await render({ type: 'image', attrs: { src: 'https://example.com/a.png' } }),
      '<img src="https://example.com/a.png" alt="" loading="lazy">'
    )
  })

  test('falls back to a level 2 heading when the level is out of range', async ({ assert }) => {
    for (const level of [0, 7, 99, -1, 2.5, 'abc', null]) {
      assert.equal(
        await render({ type: 'heading', attrs: { level }, content: [text('T')] }),
        '<h2>T</h2>',
        `level ${String(level)}`
      )
    }
    assert.equal(await render({ type: 'heading', content: [text('T')] }), '<h2>T</h2>')
    assert.equal(
      await render({ type: 'heading', attrs: { level: 6 }, content: [text('T')] }),
      '<h6>T</h6>'
    )
  })

  test('drops only the attributes that fail their rules', async ({ assert }) => {
    assert.equal(
      await render({
        type: 'image',
        attrs: { src: ' https://example.com/a.png ', alt: 'a'.repeat(501), title: '   ' },
      }),
      '<img src="https://example.com/a.png" alt="" loading="lazy">'
    )
    for (const start of [1, 0, 1_000_000, 2.5, 'x']) {
      assert.equal(
        await render({ type: 'orderedList', attrs: { start }, content: [] }),
        '<ol></ol>',
        `start ${String(start)}`
      )
    }
    for (const language of ['x'.repeat(41), 'a b', '"><script>', 42]) {
      assert.equal(
        await render({ type: 'codeBlock', attrs: { language }, content: [text('c')] }),
        '<pre><code>c</code></pre>',
        `language ${String(language)}`
      )
    }
    assert.equal(
      await render(
        paragraph(
          text('l', [{ type: 'link', attrs: { href: `https://e.com/${'a'.repeat(2048)}` } }])
        )
      ),
      '<p>l</p>'
    )
  })

  test('drops unknown node types and keeps their siblings', async ({ assert }) => {
    assert.equal(
      await render(
        { type: 'script', content: [text('alert(1)')] },
        { type: 'iframe', attrs: { src: 'https://example.com' } },
        paragraph(text('kept'))
      ),
      '<p>kept</p>'
    )
  })
})

test.group('RichTextService marks and escaping', () => {
  test('renders bold, italic, strike, underline and code marks', async ({ assert }) => {
    const cases: Array<[string, string]> = [
      ['bold', 'strong'],
      ['italic', 'em'],
      ['strike', 's'],
      ['underline', 'u'],
      ['code', 'code'],
    ]
    for (const [mark, tag] of cases) {
      assert.equal(
        await render(paragraph(text('x', [{ type: mark }]))),
        `<p><${tag}>x</${tag}></p>`
      )
    }
  })

  test('nests marks with the first mark outermost', async ({ assert }) => {
    assert.equal(
      await render(paragraph(text('x', [{ type: 'bold' }, { type: 'italic' }]))),
      '<p><strong><em>x</em></strong></p>'
    )
  })

  test('links open in a new tab with a safe rel attribute', async ({ assert }) => {
    assert.equal(
      await render(
        paragraph(text('site', [{ type: 'link', attrs: { href: 'https://example.com/?a=1&b=2' } }]))
      ),
      '<p><a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow">site</a></p>'
    )
  })

  test('escapes HTML in text', async ({ assert }) => {
    const html = await render(paragraph(text('<script>alert("x")</script> & \'y\'')))
    assert.equal(html, '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;</p>')
    assert.notInclude(html, '<script>')
  })

  test('drops unknown marks but keeps the text', async ({ assert }) => {
    assert.equal(
      await render(
        paragraph(
          text('x', [
            { type: 'textStyle', attrs: { color: 'red' } },
            { type: 'highlight' },
            { type: 'bold' },
          ])
        )
      ),
      '<p><strong>x</strong></p>'
    )
    assert.equal(await render(paragraph(text('x', [{ type: 'onclick' }]))), '<p>x</p>')
  })
})

test.group('RichTextService URL safety', () => {
  const linkHtml = async (href: string) =>
    render(paragraph(text('l', [{ type: 'link', attrs: { href } }])))
  const imageHtml = async (src: string) => render({ type: 'image', attrs: { src } })

  test('drops javascript: link hrefs however they are disguised', async ({ assert }) => {
    const hrefs = [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '  javascript:alert(1)',
      '\tjavascript:alert(1)',
      'java\nscript:alert(1)',
      'java\u0000script:alert(1)',
      '\u0001javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ]
    for (const href of hrefs) {
      assert.equal(await linkHtml(href), '<p>l</p>', JSON.stringify(href))
    }
  })

  test('keeps https, http, mailto, tel and relative links', async ({ assert }) => {
    for (const href of [
      'https://example.com/page',
      'http://example.com',
      'mailto:hello@example.com',
      'tel:+15551234',
      '/path',
      '/blog/some-post',
      '#section',
    ]) {
      const html = await linkHtml(href)
      assert.include(html, `<a href="${href}"`, href)
      assert.include(html, 'rel="noopener noreferrer nofollow"', href)
    }
  })

  test('drops images with unsafe or missing sources', async ({ assert }) => {
    for (const src of [
      'javascript:alert(1)',
      ' JAVASCRIPT:alert(1)',
      '\u0000javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'ftp://example.com/a.png',
      '',
    ]) {
      assert.equal(await imageHtml(src), '', JSON.stringify(src))
    }
    assert.equal(await render({ type: 'image' }), '')
    assert.match(await imageHtml('https://example.com/a.png'), /^<img src="https:\/\//)
  })
})

test.group('RichTextService normalize and content checks', () => {
  test('non-document input normalizes to an empty document', async ({ assert }) => {
    for (const input of [
      null,
      undefined,
      'text',
      42,
      [],
      {},
      { type: 'paragraph' },
      { type: 'doc', content: 'x' },
    ]) {
      assert.deepEqual(await service.normalize(input), { type: 'doc', content: [] })
    }
  })

  test('normalize strips unknown attributes and empty text nodes', async ({ assert }) => {
    assert.deepEqual(
      await service.normalize({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { onclick: 'x', class: 'y' },
            content: [text(''), text('hi')],
          },
        ],
      }),
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] }
    )
  })

  test('toText joins visible text and hasContent detects visible content', async ({ assert }) => {
    const doc = await service.normalize({
      type: 'doc',
      content: [paragraph(text('One')), paragraph(text('Two', [{ type: 'bold' }]))],
    })
    assert.equal(service.toText(doc), 'One Two')
    assert.isTrue(service.hasContent(doc))
  })

  test('hasContent is false for empty paragraphs and true with an image', async ({ assert }) => {
    const empty = await service.normalize({
      type: 'doc',
      content: [paragraph(), paragraph(text('   ')), paragraph({ type: 'hardBreak' })],
    })
    assert.isFalse(service.hasContent(empty))
    assert.isFalse(service.hasContent(RichTextService.emptyDocument()))
    assert.equal(service.toText(empty), '')

    const withImage = await service.normalize({
      type: 'doc',
      content: [paragraph(), { type: 'image', attrs: { src: 'https://example.com/a.png' } }],
    })
    assert.isTrue(service.hasContent(withImage))
  })
})
