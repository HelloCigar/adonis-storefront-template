import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Staff-authored blog posts. `content` keeps the editor's Tiptap JSON document so a post reopens
 * exactly as written; `content_html` is rendered from it on the server and is what public pages
 * show. A post is public once it is published and its `published_at` has passed.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('blog_posts', (table) => {
      table.increments('id')
      table.string('handle', 255).notNullable().unique()
      table.string('title', 255).notNullable()
      table.string('excerpt', 500).nullable()
      table.text('content').notNullable()
      table.text('content_html').notNullable()
      table.enum('status', ['draft', 'published']).notNullable().defaultTo('draft')
      table.timestamp('published_at').nullable()
      table
        .integer('author_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['status', 'published_at'])
      table.check("status = 'draft' OR published_at IS NOT NULL")
    })
  }

  async down() {
    this.schema.dropTable('blog_posts')
  }
}
