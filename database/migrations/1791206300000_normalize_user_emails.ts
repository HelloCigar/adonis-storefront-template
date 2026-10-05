import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      const duplicates = await db
        .from('users')
        .select(db.raw('lower(trim(email)) as normalized'))
        .groupByRaw('lower(trim(email))')
        .havingRaw('count(*) > 1')
      if (duplicates.length) {
        throw new Error(
          `Merge or rename users that differ only by email case before migrating: ${duplicates
            .map((row) => row.normalized)
            .join(', ')}`
        )
      }
      await db
        .from('users')
        .whereRaw('email <> lower(trim(email))')
        .update({ email: db.raw('lower(trim(email))') })
    })
  }

  async down() {
    // Original letter case is not retained; lowercase addresses remain valid sign-in emails.
  }
}
