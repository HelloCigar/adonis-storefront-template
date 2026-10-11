import type { BadgeProps } from '@nuxt/ui'

type Tone = NonNullable<BadgeProps['color']>
interface Status {
  label: string
  color: Tone
}

/**
 * Display labels and badge colors for each stored status value. Show statuses through this map
 * instead of the raw values so every screen uses the same words.
 */
export const statuses = {
  /** `orders.financial_status` */
  payment: {
    pending: { label: 'Awaiting payment', color: 'warning' },
    authorized: { label: 'Authorized', color: 'warning' },
    paid: { label: 'Paid', color: 'success' },
    partially_refunded: { label: 'Partially refunded', color: 'neutral' },
    refunded: { label: 'Refunded', color: 'neutral' },
    voided: { label: 'Voided', color: 'error' },
  },
  /** `orders.fulfillment_status` */
  fulfillment: {
    unfulfilled: { label: 'Unfulfilled', color: 'neutral' },
    partial: { label: 'Partially fulfilled', color: 'warning' },
    fulfilled: { label: 'Fulfilled', color: 'success' },
  },
  /** `orders.lifecycle_state` for online checkout orders */
  order: {
    pending_payment: { label: 'Awaiting payment', color: 'neutral' },
    confirmed: { label: 'Confirmed', color: 'success' },
    expired: { label: 'Expired', color: 'error' },
    cancelled: { label: 'Cancelled', color: 'error' },
    review_required: { label: 'Needs review', color: 'warning' },
  },
  /** The order's fulfillment stage, as the order queue and inbox name it */
  stage: {
    awaiting_payment: { label: 'Awaiting payment', color: 'neutral' },
    needs_attention: { label: 'Needs attention', color: 'warning' },
    to_pack: { label: 'To pack', color: 'primary' },
    to_ship: { label: 'To ship', color: 'primary' },
    in_transit: { label: 'In transit', color: 'neutral' },
    delivered: { label: 'Delivered', color: 'success' },
    cancelled: { label: 'Cancelled', color: 'error' },
    expired: { label: 'Expired', color: 'neutral' },
  },
  /** `shipments.state` */
  shipment: {
    pending: { label: 'Ready to pack', color: 'neutral' },
    packing: { label: 'Packing', color: 'warning' },
    shipped: { label: 'Shipped', color: 'success' },
    cancelled: { label: 'Cancelled', color: 'error' },
  },
  /** `payment_attempts.state`, the hosted checkout session */
  checkout: {
    creating: { label: 'Starting', color: 'neutral' },
    pending: { label: 'Awaiting payment', color: 'neutral' },
    paid: { label: 'Paid', color: 'success' },
    closing: { label: 'Closing', color: 'neutral' },
    expired: { label: 'Expired', color: 'error' },
    failed: { label: 'Failed', color: 'error' },
    unknown: { label: 'Unconfirmed', color: 'warning' },
  },
  /** `refund_operations.state` */
  refund: {
    requested: { label: 'Requested', color: 'neutral' },
    pending: { label: 'Processing', color: 'neutral' },
    succeeded: { label: 'Completed', color: 'success' },
    failed: { label: 'Failed', color: 'warning' },
    unknown: { label: 'Unconfirmed', color: 'warning' },
  },
  /** `products.status` */
  product: {
    draft: { label: 'Draft', color: 'neutral' },
    active: { label: 'Active', color: 'success' },
    archived: { label: 'Archived', color: 'neutral' },
  },
  /** `users.role` */
  role: {
    customer: { label: 'Customer', color: 'neutral' },
    staff: { label: 'Staff', color: 'primary' },
    admin: { label: 'Admin', color: 'primary' },
  },
} as const satisfies Record<string, Record<string, Status>>

export type StatusKind = keyof typeof statuses
export type StatusValue<K extends StatusKind> = keyof (typeof statuses)[K] & string

function lookup(kind: StatusKind, value: string): Status | undefined {
  // Customer order data sends upper-case values (`PAID`); stored values are lower case.
  return (statuses[kind] as Record<string, Status>)[value.toLowerCase()]
}

/** A readable label for a status value. Unknown values are humanized rather than shown raw. */
export function statusLabel(kind: StatusKind, value: string) {
  return (
    lookup(kind, value)?.label ??
    value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/^./, (letter) => letter.toUpperCase())
  )
}

export function statusColor(kind: StatusKind, value: string): Tone {
  return lookup(kind, value)?.color ?? 'neutral'
}

/** Select items for a status field, in map order or limited to `values`. */
export function statusOptions<K extends StatusKind>(kind: K, values?: readonly StatusValue<K>[]) {
  const keys = values ?? (Object.keys(statuses[kind]) as StatusValue<K>[])
  return keys.map((value): { label: string; value: string } => ({
    label: statusLabel(kind, value),
    value,
  }))
}
