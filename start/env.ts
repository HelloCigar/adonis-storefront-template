/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string.optional(),

  // Passkeys (the relying party; PASSKEY_RP_ID cannot change once users register passkeys)
  PASSKEY_RP_ID: Env.schema.string({ format: 'host' }),
  PASSKEY_ORIGINS: Env.schema.string(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),

  // Payments (optional until checkout or webhook verification is used)
  PAYMENT_PROVIDER: Env.schema.string.optional(),
  PAYMONGO_SECRET_KEY: Env.schema.secret.optional(),
  PAYMONGO_WEBHOOK_SECRET: Env.schema.secret.optional(),
  PAYMONGO_PAYMENT_METHODS: Env.schema.string.optional(),
  PAYMONGO_TIMEOUT_MS: Env.schema.number.optional(),
  PAYMONGO_WEBHOOK_TOLERANCE_SECONDS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/queue
  |----------------------------------------------------------
  */
  QUEUE_DRIVER: Env.schema.enum(['database', 'sync'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  MAIL_MAILER: Env.schema.enum.optional(['smtp'] as const),
  MAIL_FROM_NAME: Env.schema.string.optional(),
  MAIL_FROM_ADDRESS: Env.schema.string.optional(),
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.number.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.secret.optional(),
  SMTP_SECURE: Env.schema.boolean.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the limiter package
  |----------------------------------------------------------
  */
  LIMITER_STORE: Env.schema.enum(['database', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring the drive package
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs', 's3'] as const),

  // S3 (required only when DRIVE_DISK=s3; S3_ENDPOINT is for S3-compatible storage)
  AWS_ACCESS_KEY_ID: Env.schema.string.optionalWhen(() => process.env.DRIVE_DISK !== 's3'),
  AWS_SECRET_ACCESS_KEY: Env.schema.secret.optionalWhen(() => process.env.DRIVE_DISK !== 's3'),
  AWS_REGION: Env.schema.string.optionalWhen(() => process.env.DRIVE_DISK !== 's3'),
  S3_BUCKET: Env.schema.string.optionalWhen(() => process.env.DRIVE_DISK !== 's3'),
  S3_ENDPOINT: Env.schema.string.optional(),
})
