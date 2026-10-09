import { AdonisDriveStorage, defineConfig, type InferConverters } from '@jrmc/adonis-attachment'

const binaries = {
  // ffmpeg: { command: '/opt/media/bin/ffmpeg', timeout: 15_000 },
  // ffprobe: { command: '/opt/media/bin/ffprobe', timeout: 5_000 },
  // pdftoppm: { command: '/opt/media/bin/pdftoppm' },
  // pdfinfo: { command: '/opt/media/bin/pdfinfo' },
  // soffice: { command: '/opt/media/bin/libreoffice' },
}

/**
 * Store attachments on the default Drive disk (config/drive.ts) with Lucid-backed
 * relations. The package route is off: `attachments.show` serves public files at the
 * same /attachments URL, and chat photos are served only through the authorized
 * `chat.images.show` route.
 */
const attachmentConfig = defineConfig({
  storage: AdonisDriveStorage.fromApp,
  route: false,
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
