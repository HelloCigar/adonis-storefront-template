import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * How a dashboard write joins a larger change. With a client the write runs in a savepoint of
 * that transaction; with a proposal id its timeline and stock-history entries say "via copilot".
 */
export type WriteOptions = {
  client?: TransactionClientContract
  copilotProposalId?: string
}
