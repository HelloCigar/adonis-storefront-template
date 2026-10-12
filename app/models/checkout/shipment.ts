import { ShipmentSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import type { ShipmentState } from '#services/checkout/state_service'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Shipment extends compose(ShipmentSchema, withUlidPrimaryKey()) {
  @column() declare state: ShipmentState
}
