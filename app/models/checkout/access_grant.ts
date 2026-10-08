import { OrderAccessGrantSchema } from '#database/schema'

export default class AccessGrant extends OrderAccessGrantSchema {
  static table = 'order_access_grants'
}
