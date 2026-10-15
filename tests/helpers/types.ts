import type StoreSetting from '#models/settings/store_setting'
import type { PaymentRefund } from '#services/payments/payment_service'
import type { startChatServer, useChatServer } from '#tests/helpers/chat_socket'
import type { MockLanguageModelV4 } from 'ai/test'

/**
 * A Signal API call captured by "recordPasskeySignals"
 */
export type RecordedSignal = { name: string; options: Record<string, unknown> }

/**
 * A setup wizard step a store can have saved
 */
export type SetupStep = NonNullable<StoreSetting['nextSetupStep']>

/**
 * Settings a test store starts with
 */
export type StoreSettingsOptions = {
  storeName?: string
  contactEmail?: string
  shippingMinor?: number
  savedSteps?: SetupStep[]
}

/**
 * How a test chat client connects
 */
export interface ChatOpenOptions {
  cookie?: string
  auth?: Record<string, unknown>
  origin?: string
  transport?: 'polling' | 'websocket'
}

/**
 * A running chat server started by "startChatServer"
 */
export type ChatServer = Awaited<ReturnType<typeof startChatServer>>

/**
 * The group-scoped chat server returned by "useChatServer"
 */
export type GroupChatServer = ReturnType<typeof useChatServer>

/**
 * A provider call the fake payment adapter can hold in flight
 */
export type HeldCall = 'getCheckout' | 'getRefund'

/**
 * A webhook event the fake payment adapter can sign
 */
export type FakeWebhookEvent = { id: string } & (
  | { type: 'checkout.paid'; checkoutId: string }
  /** `status` is the refund's state when the provider sent this event, if not its current one. */
  | { type: 'refund.updated'; refundId: string; status?: PaymentRefund['status'] }
  | { type: 'refund.reconcile'; refundId: string }
  | { type: 'payment.refunds_changed'; paymentId: string }
)

/**
 * An order chat message as the chat server sends it, with its images
 */
export interface ChatImageMessage {
  id: string
  roomKey: string
  body: string
  senderRole: 'customer' | 'staff'
  images: { id: string; url: string; name: string; mimeType: string }[]
}

/**
 * An order chat message as the order room sends it
 */
export interface ChatRoomMessage {
  id: string
  roomKey: string
  body: string
  senderName: string
  senderRole: 'customer' | 'staff'
  automated: boolean
  read: boolean
}

/**
 * One row of the staff order queue page
 */
export interface QueueRow {
  id: string
  number: string
  customer: string | null
  stages: string[]
  nextStep: string
  waitingSince: string | null
}

/** What the scripted shopping assistant model received on one call. */
export type ScriptedModelCall = Parameters<MockLanguageModelV4['doStream']>[0]

/** One chunk the scripted shopping assistant model streams back. */
export type ScriptedStreamPart =
  Awaited<ReturnType<MockLanguageModelV4['doStream']>>['stream'] extends ReadableStream<infer Part>
    ? Part
    : never

/** One step a test scripts for the shopping assistant model. */
export type ScriptedModelStep =
  | { kind: 'text'; text: string }
  | { kind: 'tools'; toolName: string; inputs: Record<string, unknown>[] }
  | { kind: 'fail' }
