import { urlFor } from '@adonisjs/core/services/url_builder'
import mail from '@adonisjs/mail/services/main'
import type { Recipient } from '@adonisjs/mail/types'
import Order from '#models/checkout/order'
import OrderAddress from '#models/checkout/order_address'
import OrderLineItem from '#models/checkout/order_line_item'
import Shipment from '#models/checkout/shipment'
import type Notification from '#models/checkout/notification'
import OrderNotification from '#mails/checkout/order_notification'

const publicId = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const tracking = {
  carrier: 'Metro Courier',
  trackingNumber: 'MC-2026-004812',
  trackingUrl: 'https://tracking.example/MC-2026-004812',
}

/** Every transactional email, with the sample state that exercises each template branch. */
const previews = {
  'receipt': {
    name: 'Payment received',
    description: 'Sent once a payment settles. Includes the order summary.',
    kind: 'receipt',
    shipment: null,
  },
  'shipment': {
    name: 'Order shipped',
    description: 'Sent when staff ship the parcel with tracking details.',
    kind: 'shipment',
    shipment: tracking,
  },
  'shipment-untracked': {
    name: 'Order shipped, no tracking',
    description: 'Sent when staff ship the parcel without a carrier or tracking number.',
    kind: 'shipment',
    shipment: { carrier: null, trackingNumber: null, trackingUrl: null },
  },
  'delivery': {
    name: 'Order delivered',
    description: 'Sent when staff confirm the carrier delivered the parcel.',
    kind: 'delivery',
    shipment: tracking,
  },
} satisfies Record<
  string,
  {
    name: string
    description: string
    kind: Notification['kind']
    shipment: Pick<Shipment, 'carrier' | 'trackingNumber' | 'trackingUrl'> | null
  }
>

export type EmailPreviewKey = keyof typeof previews

export interface EmailPreview {
  key: EmailPreviewKey
  name: string
  description: string
  subject: string
  from: string
  to: string
  /** Rendered bodies; only present for the email being previewed. */
  html: string | null
  text: string | null
}

/**
 * Renders transactional emails with in-memory sample data so staff can review them.
 * Nothing is persisted, no access grant is issued, and no transport is used.
 */
export default class EmailPreviewService {
  isKey(key: string): key is EmailPreviewKey {
    return Object.hasOwn(previews, key)
  }

  /** Lists every email with its subject, without rendering templates. */
  async list(origin: string) {
    const keys = Object.keys(previews) as EmailPreviewKey[]
    return Promise.all(keys.map((key) => this.build(key, origin, false)))
  }

  /** Renders one email's HTML and text bodies the way the mailer would before sending. */
  render(key: EmailPreviewKey, origin: string) {
    return this.build(key, origin, true)
  }

  private async build(
    key: EmailPreviewKey,
    origin: string,
    render: boolean
  ): Promise<EmailPreview> {
    const preview = previews[key]
    const accessUrl = urlFor(
      'checkout.access.show',
      { publicId },
      { prefixUrl: origin, qs: { token: 'preview' } }
    )
    const shipment = preview.shipment ? new Shipment().merge(preview.shipment) : null
    const email = new OrderNotification(this.order(), preview.kind, accessUrl, shipment, 0)
    await email.build()
    // Mirrors Mailer.sendCompiled: templates receive the mailer globals, such as brandName.
    if (render) await email.message.computeContents(mail.config.globals)
    const { message } = email.message.toObject()
    return {
      key,
      name: preview.name,
      description: preview.description,
      subject: message.subject ?? '',
      from: this.recipient(message.from ?? mail.config.from),
      to: this.recipient(message.to?.[0]),
      html: render ? String(message.html ?? '') : null,
      text: render ? String(message.text ?? '') : null,
    }
  }

  private order() {
    const order = new Order().merge({
      publicId,
      number: `MB-${publicId.replaceAll('-', '').slice(0, 16).toUpperCase()}`,
      email: 'maria.santos@example.com',
      currencyCode: 'PHP',
      subtotalMinor: 212_000,
      discountMinor: 21_200,
      shippingMinor: 10_000,
      taxMinor: 0,
      totalMinor: 200_800,
    })
    order.$setRelated('lineItems', [
      new OrderLineItem().merge({
        title: 'Linen Throw Pillow',
        variantTitle: 'Sand / 18 in',
        quantity: 2,
        unitPriceMinor: 85_000,
        totalMinor: 170_000,
        currencyCode: 'PHP',
      }),
      new OrderLineItem().merge({
        title: 'Stoneware Mug',
        variantTitle: 'Default',
        quantity: 1,
        unitPriceMinor: 42_000,
        totalMinor: 42_000,
        currencyCode: 'PHP',
      }),
    ])
    order.$setRelated('addresses', [
      new OrderAddress().merge({
        type: 'shipping',
        firstName: 'Maria',
        lastName: 'Santos',
        company: null,
        address1: '123 Mabini Street',
        address2: 'Unit 4B',
        city: 'Makati City',
        zoneCode: 'NCR',
        postalCode: '1210',
        countryCode: 'PH',
      }),
    ])
    return order
  }

  private recipient(recipient: Recipient | undefined) {
    if (!recipient) return ''
    if (typeof recipient === 'string') return recipient
    return recipient.name ? `${recipient.name} <${recipient.address}>` : recipient.address
  }
}
