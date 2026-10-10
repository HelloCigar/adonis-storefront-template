import type { Data } from '@generated/data'

type Stage = Data.Chat.Thread['stage']

/** How the inbox names each fulfillment step, matching the order queue's wording. */
export const stagePresentation: Record<
  Stage,
  { label: string; color: 'neutral' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  awaiting_payment: { label: 'Awaiting payment', color: 'neutral' },
  needs_attention: { label: 'Needs attention', color: 'warning' },
  to_pack: { label: 'To pack', color: 'primary' },
  to_ship: { label: 'To ship', color: 'primary' },
  in_transit: { label: 'In transit', color: 'neutral' },
  delivered: { label: 'Delivered', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  expired: { label: 'Expired', color: 'neutral' },
}
