import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type { addressValidator } from '#validators/storefront'

export default class CustomerAddressService {
  async create(user: User, payload: Infer<typeof addressValidator>) {
    const { defaultAddress, zip, territoryCode, ...data } = payload
    await db.transaction(async (trx) => {
      user.useTransaction(trx)
      const created = await user
        .related('addresses')
        .create({ ...data, postalCode: zip, countryCode: territoryCode.toUpperCase() })
      if (defaultAddress || !user.defaultAddressId) {
        user.defaultAddressId = created.id
        await user.save()
      }
    })
  }

  async update(user: User, id: number | string, payload: Infer<typeof addressValidator>) {
    const { defaultAddress, zip, territoryCode, ...data } = payload
    const address = await user.related('addresses').query().where('id', id).firstOrFail()
    await db.transaction(async (trx) => {
      address
        .useTransaction(trx)
        .merge({ ...data, postalCode: zip, countryCode: territoryCode.toUpperCase() })
      await address.save()
      if (defaultAddress) {
        user.useTransaction(trx)
        user.defaultAddressId = address.id
        await user.save()
      }
    })
  }

  async setDefault(user: User, id: number | string) {
    const address = await user.related('addresses').query().where('id', id).firstOrFail()
    user.defaultAddressId = address.id
    await user.save()
  }

  async delete(user: User, id: number | string) {
    const address = await user.related('addresses').query().where('id', id).firstOrFail()
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
}
