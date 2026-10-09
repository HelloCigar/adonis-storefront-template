import { readFile } from 'node:fs/promises'
import { DateTime } from 'luxon'
import edge from 'edge.js'
import { render } from 'takumi-pdf'
import app from '@adonisjs/core/services/app'
import type Order from '#models/checkout/order'
import { storeEmail, storeName } from '#config/mail'

/** Matches the storefront and receipt email: en-PH formatting, Manila calendar dates. */
const locale = 'en-PH'
const zone = 'Asia/Manila'

/** The store font, bundled because Takumi never reads system fonts; it covers the peso sign. */
const fonts = [400, 700].map((weight) => ({
  name: 'Bricolage Grotesque',
  weight,
  data: () =>
    readFile(
      app.makePath(`resources/fonts/BricolageGrotesque-${weight === 700 ? 'Bold' : 'Regular'}.ttf`)
    ),
}))

/** Receipt email palette (DESIGN.md light theme). */
const css = `
  .invoice { font-family: 'Bricolage Grotesque'; font-size: 13px; line-height: 1.45; color: #473c39; }
  p, h1, h2 { margin: 0; }
  .muted { color: #7c6d67; font-size: 12px; }
  .masthead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
  .store, h1 { font-size: 26px; font-weight: 700; line-height: 1.2; color: #1d1816; }
  table { width: 100%; border-collapse: collapse; }
  th { font-weight: 400; text-align: left; }
  .facts { width: auto; margin-bottom: 32px; }
  .facts th { width: 140px; padding: 2px 0; color: #7c6d67; }
  .facts td { padding: 2px 0; color: #1d1816; }
  .parties { display: flex; gap: 32px; margin-bottom: 36px; }
  .party { flex: 1; }
  .party h2, .items thead th { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #7c6d67; }
  .party h2 { margin-bottom: 6px; }
  .items thead th { padding: 0 0 8px; border-bottom: 1px solid #1d1816; }
  .items td { padding: 10px 0; border-bottom: 1px solid #e8e4e3; vertical-align: top; color: #1d1816; }
  .items tr { break-inside: avoid; }
  .items .item { padding-right: 20px; }
  .items .detail { font-size: 11px; color: #7c6d67; margin-top: 2px; }
  .items .num { width: 110px; text-align: right; white-space: nowrap; }
  .items .qty { width: 56px; }
  .closing { break-inside: avoid; }
  .totals { width: 380px; margin: 16px 0 0 auto; }
  .totals th, .totals td { padding: 4px 0; }
  .totals th { text-align: right; padding-right: 20px; }
  .totals td { text-align: right; white-space: nowrap; color: #1d1816; }
  .totals .grand th, .totals .grand td { padding-top: 10px; border-top: 1px solid #1d1816; font-size: 16px; font-weight: 700; color: #1d1816; }
  .thanks { margin-top: 48px; }
`

/**
 * Renders a paid order's invoice as a PDF from the order's own snapshot, so later
 * catalogue or price edits never change an invoice already issued. The layout is an
 * Edge template; Takumi turns it into a paged, tagged PDF with selectable text.
 */
export default class InvoiceService {
  /** An invoice exists once payment settled; its issue date is the payment date. */
  isAvailable(order: Order) {
    return order.paidAt !== null
  }

  filename(order: Order) {
    return `invoice-${order.number}.pdf`
  }

  async render(order: Order): Promise<Buffer> {
    if (!order.paidAt) throw new Error('Only a paid order has an invoice')
    await order.load('lineItems', (items) => items.orderBy('id'))
    await order.load('addresses')

    const html = await edge.render('invoices/invoice', this.viewData(order))
    // Takumi fills the pageNumber and totalPages classes on every page.
    const footer = await edge.render('invoices/footer', { storeName, storeEmail })
    const pdf = await render(html, {
      size: 'a4',
      margin: { left: 64, right: 64, top: 64 },
      fonts,
      css,
      lang: 'en-PH',
      footer,
      metadata: {
        title: `Invoice ${order.number}`,
        authors: [storeName],
        creationDate: order.paidAt.toUTC().toFormat("yyyy-LL-dd'T'HH:mm:ss"),
      },
    })
    return Buffer.from(pdf)
  }

  /** Templates receive display-ready values, so the layout holds no formatting rules. */
  private viewData(order: Order) {
    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: order.currencyCode })
    const date = (value: DateTime) =>
      value.setZone(zone).setLocale(locale).toLocaleString(DateTime.DATE_FULL)
    const billing = order.addresses.find((address) => address.type === 'billing')
    const shipping = order.addresses.find((address) => address.type === 'shipping')

    return {
      storeName,
      storeEmail,
      facts: [
        { label: 'Invoice number', value: order.number },
        { label: 'Date issued', value: date(order.paidAt!) },
        { label: 'Order placed', value: date(order.processedAt) },
        { label: 'Status', value: 'Paid' },
      ],
      parties: [
        {
          title: 'Billed to',
          lines: [
            ...((billing ?? shipping)?.displayLines ?? []),
            order.email,
            order.phoneNumber,
          ].filter(Boolean),
        },
        { title: 'Ship to', lines: shipping?.displayLines ?? [] },
      ],
      items: order.lineItems.map((item) => ({
        title: item.title,
        detail: [
          item.variantTitle && item.variantTitle !== 'Default' ? item.variantTitle : null,
          item.sku ? `SKU ${item.sku}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        quantity: item.quantity,
        unitPrice: money.format(item.unitPriceAmount),
        total: money.format(item.totalAmount),
      })),
      totals: [
        { label: 'Subtotal', amount: money.format(order.subtotalAmount) },
        order.discountAmount > 0 && {
          label: order.discountCode ? `Discount (${order.discountCode})` : 'Discount',
          amount: `−${money.format(order.discountAmount)}`,
        },
        { label: 'Shipping', amount: money.format(order.shippingAmount) },
        order.taxAmount > 0 && { label: 'Tax', amount: money.format(order.taxAmount) },
      ].filter(Boolean),
      total: money.format(order.totalAmount),
    }
  }
}
