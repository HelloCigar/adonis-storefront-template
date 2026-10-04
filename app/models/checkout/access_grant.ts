import { OrderAccessGrantSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

export default class AccessGrant extends OrderAccessGrantSchema {
  static table = 'order_access_grants'
  @column({ consume: Number }) declare expiresAtMs: number
}
