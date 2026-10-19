import Activity from '#models/checkout/activity'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class ActivityService {
  record(
    trx: TransactionClientContract,
    orderId: string,
    event: string,
    details: Record<string, string | number | null> = {},
    actorId?: string,
    copilotProposalId?: string
  ) {
    return Activity.create(
      {
        orderId,
        event,
        details,
        actorId: actorId ?? null,
        source: actorId ? 'staff' : 'system',
        viaCopilot: Boolean(copilotProposalId),
        copilotProposalId: copilotProposalId ?? null,
      },
      { client: trx }
    )
  }
}
