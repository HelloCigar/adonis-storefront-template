import type User from '#models/account/user'
import type CustomerAddress from '#models/account/customer_address'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type { addressValidator } from '#validators/account/address'

type AddressPayload = Infer<typeof addressValidator>

export default class CustomerAddressService {
  async create(user: User, payload: AddressPayload) {
    const { defaultAddress, ...data } = payload
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      const created = await user.related('addresses').create(this.columns(data))
      if (defaultAddress || !user.defaultAddressId) {
        user.defaultAddressId = created.id
        await user.save()
      }
    })
  }

  async update(user: User, address: CustomerAddress, payload: AddressPayload) {
    const { defaultAddress, ...data } = payload
    await db.transaction(async (trx) => {
      await address.useTransaction(trx).merge(this.columns(data)).save()
      if (defaultAddress) {
        user.useTransaction(trx)
        user.defaultAddressId = address.id
        await user.save()
      }
    })
  }

  async setDefault(user: User, address: CustomerAddress) {
    user.defaultAddressId = address.id
    await user.save()
  }

  async delete(user: User, address: CustomerAddress) {
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      address.useTransaction(trx)
      if (user.defaultAddressId === address.id) {
        user.defaultAddressId = null
        await user.save()
      }
      await address.delete()
    })
  }

  /** Maps the storefront address form onto the stored column names. */
  private columns({ zip, territoryCode, ...data }: Omit<AddressPayload, 'defaultAddress'>) {
    return { ...data, postalCode: zip, countryCode: territoryCode }
  }
}
