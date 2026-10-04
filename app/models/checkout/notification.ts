import { OrderNotificationSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

export default class Notification extends OrderNotificationSchema {
  static table = 'order_notifications'
  @column() declare kind: 'receipt' | 'shipment'
  @column() declare state: 'pending' | 'sent' | 'failed'
}
