import Activity from '#models/checkout/activity'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class ActivityService {
  record(
    trx: TransactionClientContract,
    orderId: number,
    event: string,
    details: Record<string, string | number | null> = {},
    actorId?: number
  ) {
    return Activity.create(
      { orderId, event, details, actorId: actorId ?? null, source: actorId ? 'staff' : 'system' },
      { client: trx }
    )
  }
}
