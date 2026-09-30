import { attachmentManager } from '@jrmc/adonis-attachment'

/** Local, deterministic fixture media: seeding never fetches a remote image. */
export function createFixtureImage(name: string) {
  const colors = ['#7c9271', '#caab82', '#8ba4b3', '#bc8b85']
  const color = colors[name.length % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
    <rect width="800" height="800" fill="#f3f1eb"/>
    <ellipse cx="400" cy="650" rx="210" ry="32" fill="#d9d7ce"/>
    <rect x="220" y="210" width="360" height="430" rx="68" fill="${color}"/>
    <rect x="270" y="260" width="260" height="300" rx="36" fill="#ffffff" opacity=".18"/>
    <circle cx="400" cy="602" r="12" fill="#f3f1eb"/>
  </svg>`
  return attachmentManager.createFromBuffer(Buffer.from(svg), {
    originalName: name.replace(/[^a-z0-9-]/gi, '-').slice(0, 100) + '.svg',
    mimeType: 'image/svg+xml',
    meta: false,
    variants: [],
    metadata: { dimension: { width: 800, height: 800 } },
  })
}
