import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * Attachment bytes live on one of these disks; each stored file records its disk, so
 * files keep reading from where they were written after DRIVE_DISK changes. Files are
 * private and are served only through `attachments.show` and `chat.images.show`, so
 * Drive's own file route stays off.
 */
const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),

  services: {
    s3: services.s3({
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY')?.release() ?? '',
      },
      endpoint: env.get('S3_ENDPOINT'),
      region: env.get('AWS_REGION', ''),
      bucket: env.get('S3_BUCKET', ''),
      visibility: 'private',
    }),
    fs: services.fs({
      location: app.inTest
        ? app.tmpPath(
            env.get('TEST_SHARD') ? `test-attachments-${env.get('TEST_SHARD')}` : 'test-attachments'
          )
        : app.makePath('storage/attachments'),
      serveFiles: false,
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
