import CheckoutException from '#exceptions/checkout_exception'

export type CartState = 'active' | 'submitted' | 'completed' | 'abandoned'
export type OrderState =
  'pending_payment' | 'confirmed' | 'expired' | 'cancelled' | 'review_required'
export type AttemptState =
  'creating' | 'pending' | 'paid' | 'closing' | 'expired' | 'failed' | 'unknown'
export type ReservationState = 'reserved' | 'consumed' | 'released'
export type ShipmentState = 'pending' | 'packing' | 'shipped' | 'delivered' | 'cancelled'
/** Shipment states after the parcel leaves the store. Cancellation and refunds stop here. */
export const dispatchedShipmentStates = ['shipped', 'delivered'] as const satisfies ShipmentState[]
export const isDispatched = (state: ShipmentState | null | undefined) =>
  dispatchedShipmentStates.some((dispatched) => dispatched === state)
export type RefundState = 'requested' | 'pending' | 'succeeded' | 'failed' | 'unknown'
export type FinancialState = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'

interface States {
  cart: CartState
  order: OrderState
  attempt: AttemptState
  reservation: ReservationState
  shipment: ShipmentState
  refund: RefundState
}

const transitions: { [K in keyof States]: Record<States[K], readonly States[K][]> } = {
  cart: {
    active: ['submitted'],
    submitted: ['completed', 'abandoned'],
    completed: [],
    abandoned: [],
  },
  order: {
    pending_payment: ['confirmed', 'expired', 'cancelled', 'review_required'],
    confirmed: ['cancelled', 'review_required'],
    expired: ['confirmed', 'review_required'],
    cancelled: ['review_required'],
    review_required: ['confirmed', 'cancelled'],
  },
  attempt: {
    creating: ['pending', 'paid', 'closing', 'failed', 'unknown'],
    pending: ['paid', 'closing', 'unknown'],
    paid: [],
    closing: ['paid', 'expired', 'unknown'],
    expired: ['paid'],
    failed: ['creating', 'closing'],
    unknown: ['creating', 'pending', 'paid', 'closing', 'expired', 'failed'],
  },
  reservation: { reserved: ['consumed', 'released'], consumed: [], released: [] },
  shipment: {
    pending: ['packing', 'cancelled'],
    packing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  },
  refund: {
    requested: ['pending', 'succeeded', 'failed', 'unknown'],
    pending: ['succeeded', 'failed', 'unknown'],
    succeeded: [],
    failed: [],
    unknown: ['pending', 'succeeded', 'failed'],
  },
}

/** Evaluates transitions only. Services apply domain guards and persist them atomically. */
export default class StateService {
  transition<K extends keyof States>(dimension: K, from: States[K], to: States[K]): States[K] {
    if (from === to) return to
    const table = transitions[dimension] as Record<string, readonly string[]>
    if (!table[from]?.includes(to)) {
      throw new CheckoutException('This state transition is not allowed', 'E_CHECKOUT_TRANSITION')
    }
    return to
  }

  financial(captured: number, refunded: number, voided = false): FinancialState {
    if (
      !Number.isSafeInteger(captured) ||
      !Number.isSafeInteger(refunded) ||
      captured < 0 ||
      refunded < 0 ||
      refunded > captured
    ) {
      throw new CheckoutException('Invalid payment balance', 'E_CHECKOUT_BALANCE')
    }
    if (captured === 0) return voided ? 'voided' : 'pending'
    if (refunded === captured) return 'refunded'
    return refunded > 0 ? 'partially_refunded' : 'paid'
  }
}
