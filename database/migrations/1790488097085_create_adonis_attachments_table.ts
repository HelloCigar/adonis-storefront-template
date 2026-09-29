import { BaseSchema } from '@adonisjs/lucid/schema'
import { AttachmentSchemaService } from '@jrmc/adonis-attachment/lucid'

export default class CreateAdonisAttachmentsTable extends BaseSchema {
  protected tableName = 'adonis_attachments'

  async up() {
    await new AttachmentSchemaService(this.db.getWriteClient(), {
      tableName: this.tableName,
    }).createTables()
  }

  async down() {
    await new AttachmentSchemaService(this.db.getWriteClient(), {
      tableName: this.tableName,
    }).dropTables()
  }
}
