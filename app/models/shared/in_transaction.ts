import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Runs `work` in the caller's transaction when given one, otherwise in a new one. Joining
 * directly (not a savepoint) keeps after-commit hooks waiting for the real commit.
 */
export function inTransaction<Result>(
  client: TransactionClientContract | undefined,
  work: (trx: TransactionClientContract) => Promise<Result>
) {
  return client ? work(client) : db.transaction(work)
}
