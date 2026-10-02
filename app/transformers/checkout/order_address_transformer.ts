import type OrderAddress from '#models/checkout/order_address'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class OrderAddressTransformer extends BaseTransformer<OrderAddress> {
  toObject() {
    const name = [this.resource.firstName, this.resource.lastName].filter(Boolean).join(' ')
    const locality = [this.resource.city, this.resource.zoneCode, this.resource.postalCode]
      .filter(Boolean)
      .join(', ')

    return {
      ...this.pick(this.resource, [
        'id',
        'type',
        'firstName',
        'lastName',
        'company',
        'address1',
        'address2',
        'city',
        'zoneCode',
        'countryCode',
        'postalCode',
        'phoneNumber',
        'createdAt',
        'updatedAt',
      ]),
      formatted: [
        name,
        this.resource.company,
        this.resource.address1,
        this.resource.address2,
        locality,
        this.resource.countryCode,
      ].filter((line): line is string => Boolean(line)),
      territoryCode: this.resource.countryCode,
      zip: this.resource.postalCode,
    }
  }
}
