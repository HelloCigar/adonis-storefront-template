import { ShipmentSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { ShipmentState } from '#services/checkout/state_service'

export default class Shipment extends ShipmentSchema {
  @column() declare state: ShipmentState
}
