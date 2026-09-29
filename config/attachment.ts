import { defineConfig, LocalFileStorage, type InferConverters } from '@jrmc/adonis-attachment'

const binaries = {
  // ffmpeg: { command: '/opt/media/bin/ffmpeg', timeout: 15_000 },
  // ffprobe: { command: '/opt/media/bin/ffprobe', timeout: 5_000 },
  // pdftoppm: { command: '/opt/media/bin/pdftoppm' },
  // pdfinfo: { command: '/opt/media/bin/pdfinfo' },
  // soffice: { command: '/opt/media/bin/libreoffice' },
}

/**
 * Store attachments locally with Lucid-backed relations. The attachment
 * provider serves public files through its /attachments route.
 */
const attachmentConfig = defineConfig({
  storage: (app) =>
    app.inTest
      ? new LocalFileStorage({ location: app.tmpPath('test-attachments') })
      : LocalFileStorage.fromApp(app),
  integrations: {
    lucid: {},
  },
  queue: {
    default: 'memory',
    connections: {
      memory: { driver: 'memory', concurrency: 1 },
    },
  },
  media: {
    binaries,
    // metadataPolicy: { mode: 'deferred', variants: false },
  },
  // converters: {
  //   thumbnail: {
  //     width: 320,
  //     format: 'webp',
  //   },
  // },
})

export default attachmentConfig

declare module '@jrmc/adonis-attachment' {
  interface AttachmentVariants extends InferConverters<typeof attachmentConfig> {}
}
