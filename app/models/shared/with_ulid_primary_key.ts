import { monotonicFactory } from 'ulid'
import { beforeCreate, type BaseModel } from '@adonisjs/lucid/orm'
import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

/**
 * One factory per process: monotonic ULIDs stay strictly increasing even within a single
 * millisecond, so `orderBy('id')` keeps meaning insertion order.
 */
const nextUlid = monotonicFactory()

/** A new record id, for rows written without a model (raw inserts). */
export function newUlid() {
  return nextUlid()
}

/** Whether a value has the shape of a record id: 26 Crockford base32 characters. */
export function isUlid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value)
}

/** Gives a model a ULID primary key, assigned on create unless the caller already set one. */
export function withUlidPrimaryKey() {
  return <Model extends NormalizeConstructor<typeof BaseModel>>(superclass: Model) => {
    class WithUlidPrimaryKey extends superclass {
      static selfAssignPrimaryKey = true

      @beforeCreate()
      static assignUlid(model: WithUlidPrimaryKey & { id?: string }) {
        if (!model.id) model.id = newUlid()
      }
    }

    return WithUlidPrimaryKey
  }
}
