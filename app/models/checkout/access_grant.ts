import { OrderAccessGrantSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class AccessGrant extends compose(OrderAccessGrantSchema, withUlidPrimaryKey()) {
  static table = 'order_access_grants'
}
