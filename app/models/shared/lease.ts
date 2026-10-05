import type { ChainableContract } from '@adonisjs/lucid/types/querybuilder'

/**
 * Background work is claimed with a random token and an expiry. Only the token holder
 * may finish the work; once the expiry passes, another worker may take it over.
 */
export const leaseMs = {
  /** Provider calls, refunds, lookups and notifications. */
  operation: 120_000,
  /** Handing an outbox row to the queue. */
  publication: 60_000,
} as const

/** Query constraint for rows that are not currently claimed. */
export function unleased<Query extends ChainableContract>(query: Query) {
  return query.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
}

/** Column values that claim a row for `token` for the given duration. */
export function leaseFor(token: string, durationMs: number) {
  return { claimToken: token, claimExpiresAtMs: Date.now() + durationMs }
}

/** Column values that release a claim. */
export function leaseReleased() {
  return { claimToken: null, claimExpiresAtMs: null }
}

/** Whether a loaded row is still claimed by some worker. */
export function isLeased(row: { claimExpiresAtMs: number | bigint | null }) {
  return Number(row.claimExpiresAtMs ?? 0) > Date.now()
}
