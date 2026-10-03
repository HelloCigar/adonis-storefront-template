import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await db.from('users').where('role', 'seller').update({ role: 'staff' })
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.from('users').where('role', 'staff').update({ role: 'seller' })
    })
  }
}
