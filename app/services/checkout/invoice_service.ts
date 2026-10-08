import PDFDocument from 'pdfkit'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import type Order from '#models/checkout/order'
import type OrderLineItem from '#models/checkout/order_line_item'
import { storeEmail, storeName } from '#config/mail'

/** Matches the storefront and receipt email: en-PH formatting, Manila calendar dates. */
const locale = 'en-PH'
const zone = 'Asia/Manila'

/** Receipt email palette (DESIGN.md light theme). */
const ink = '#1d1816'
const body = '#473c39'
const muted = '#7c6d67'
const rule = '#e8e4e3'

const page = { left: 48, right: 547, top: 48, bottom: 790 }
const columns = {
  item: { x: page.left, width: 250 },
  quantity: { x: 300, width: 40 },
  unitPrice: { x: 348, width: 92 },
  amount: { x: 447, width: 100 },
}

/**
 * Renders a paid order's invoice as a PDF from the order's own snapshot, so later
 * catalogue or price edits never change an invoice already issued.
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

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: page.top, left: page.left, right: 48, bottom: 48 },
      bufferPages: true,
      info: {
        Title: `Invoice ${order.number}`,
        Author: storeName,
        CreationDate: order.paidAt.toJSDate(),
      },
    })
    doc.registerFont('regular', app.makePath('resources/fonts/BricolageGrotesque-Regular.ttf'))
    doc.registerFont('bold', app.makePath('resources/fonts/BricolageGrotesque-Bold.ttf'))
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: order.currencyCode })
    this.header(doc, order)
    this.parties(doc, order)
    this.lineItems(doc, order.lineItems, money)
    this.totals(doc, order, money)
    this.footers(doc)
    doc.end()
    return finished
  }

  private header(doc: PDFKit.PDFDocument, order: Order) {
    const date = (value: DateTime) =>
      value.setZone(zone).setLocale(locale).toLocaleString(DateTime.DATE_FULL)
    doc.font('bold').fontSize(20).fillColor(ink).text(storeName, page.left, page.top)
    doc.font('regular').fontSize(9).fillColor(muted).text(storeEmail)
    doc
      .font('bold')
      .fontSize(20)
      .fillColor(ink)
      .text('Invoice', page.left, page.top, { width: page.right - page.left, align: 'right' })

    const facts = [
      ['Invoice number', order.number],
      ['Date issued', date(order.paidAt!)],
      ['Order placed', date(order.processedAt)],
      ['Status', 'Paid'],
    ]
    let y = page.top + 64
    for (const [label, value] of facts) {
      doc.font('regular').fontSize(9).fillColor(muted).text(label, page.left, y, { width: 110 })
      doc
        .font('regular')
        .fontSize(9)
        .fillColor(ink)
        .text(value, page.left + 110, y)
      y += 15
    }
    doc.y = y + 18
  }

  private parties(doc: PDFKit.PDFDocument, order: Order) {
    const billing = order.addresses.find((address) => address.type === 'billing')
    const shipping = order.addresses.find((address) => address.type === 'shipping')
    const blocks = [
      {
        title: 'Billed to',
        lines: [...((billing ?? shipping)?.displayLines ?? []), order.email, order.phoneNumber],
      },
      { title: 'Ship to', lines: shipping?.displayLines ?? [] },
    ]
    const top = doc.y
    let bottom = top
    blocks.forEach((block, index) => {
      const x = page.left + index * 250
      doc.font('bold').fontSize(9).fillColor(muted).text(block.title.toUpperCase(), x, top, {
        width: 230,
        characterSpacing: 0.6,
      })
      doc.moveDown(0.4).font('regular').fontSize(10).fillColor(body)
      for (const line of block.lines.filter(Boolean)) doc.text(line!, x, doc.y, { width: 230 })
      bottom = Math.max(bottom, doc.y)
    })
    doc.y = bottom + 28
  }

  private lineItems(doc: PDFKit.PDFDocument, items: OrderLineItem[], money: Intl.NumberFormat) {
    this.tableHeader(doc)
    for (const item of items) {
      const meta = [
        item.variantTitle && item.variantTitle !== 'Default' ? item.variantTitle : null,
        item.sku ? `SKU ${item.sku}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
      doc.font('regular').fontSize(10)
      const titleHeight = doc.heightOfString(item.title, { width: columns.item.width })
      doc.fontSize(8.5)
      const metaHeight = meta ? doc.heightOfString(meta, { width: columns.item.width }) + 2 : 0
      const rowHeight = titleHeight + metaHeight + 16
      if (doc.y + rowHeight > page.bottom) {
        doc.addPage()
        this.tableHeader(doc)
      }

      const y = doc.y + 8
      doc.font('regular').fontSize(10).fillColor(ink)
      doc.text(item.title, columns.item.x, y, { width: columns.item.width })
      if (meta) {
        doc.fontSize(8.5).fillColor(muted)
        doc.text(meta, columns.item.x, y + titleHeight + 2, { width: columns.item.width })
      }
      doc.fontSize(10).fillColor(ink)
      this.cell(doc, String(item.quantity), columns.quantity, y)
      this.cell(doc, money.format(item.unitPriceAmount), columns.unitPrice, y)
      this.cell(doc, money.format(item.totalAmount), columns.amount, y)
      doc.y = y + rowHeight - 8
      this.rule(doc)
    }
  }

  private tableHeader(doc: PDFKit.PDFDocument) {
    const y = doc.y
    doc.font('bold').fontSize(8.5).fillColor(muted)
    doc.text('ITEM', columns.item.x, y, { width: columns.item.width, characterSpacing: 0.6 })
    this.cell(doc, 'QTY', columns.quantity, y, 0.6)
    this.cell(doc, 'UNIT PRICE', columns.unitPrice, y, 0.6)
    this.cell(doc, 'AMOUNT', columns.amount, y, 0.6)
    doc.y = y + 16
    this.rule(doc, ink)
  }

  private totals(doc: PDFKit.PDFDocument, order: Order, money: Intl.NumberFormat) {
    const rows = [
      { label: 'Subtotal', amount: money.format(order.subtotalAmount) },
      order.discountAmount > 0 && {
        label: order.discountCode ? `Discount (${order.discountCode})` : 'Discount',
        amount: `−${money.format(order.discountAmount)}`,
      },
      { label: 'Shipping', amount: money.format(order.shippingAmount) },
      order.taxAmount > 0 && { label: 'Tax', amount: money.format(order.taxAmount) },
    ].filter((row): row is { label: string; amount: string } => Boolean(row))
    if (doc.y + rows.length * 18 + 60 > page.bottom) doc.addPage()

    const labels = { x: 260, width: 180 }
    let y = doc.y + 12
    doc.font('regular').fontSize(10)
    for (const row of rows) {
      doc.fillColor(body)
      this.cell(doc, row.label, labels, y)
      this.cell(doc, row.amount, columns.amount, y)
      y += 18
    }
    doc
      .moveTo(labels.x, y + 2)
      .lineTo(page.right, y + 2)
      .lineWidth(0.75)
      .strokeColor(ink)
      .stroke()
    y += 10
    doc.font('bold').fontSize(12).fillColor(ink)
    this.cell(doc, 'Total paid', labels, y)
    this.cell(doc, money.format(order.totalAmount), columns.amount, y)
    doc.y = y + 40
    doc.x = page.left
    doc
      .font('regular')
      .fontSize(10)
      .fillColor(body)
      .text('Thank you for shopping with us.', page.left, doc.y)
  }

  /** Every page gets the store and page count; drawn last, once the page count is known. */
  private footers(doc: PDFKit.PDFDocument) {
    const range = doc.bufferedPageRange()
    for (let index = range.start; index < range.start + range.count; index++) {
      doc.switchToPage(index)
      // Writing inside the bottom margin would otherwise start a new page.
      doc.page.margins.bottom = 0
      const y = page.bottom + 20
      doc.font('regular').fontSize(8).fillColor(muted)
      doc.text(`${storeName} · ${storeEmail}`, page.left, y, { lineBreak: false })
      this.cell(doc, `Page ${index + 1} of ${range.count}`, columns.amount, y)
    }
  }

  private cell(
    doc: PDFKit.PDFDocument,
    text: string,
    column: { x: number; width: number },
    y: number,
    characterSpacing = 0
  ) {
    doc.text(text, column.x, y, {
      width: column.width,
      align: 'right',
      lineBreak: false,
      characterSpacing,
    })
  }

  private rule(doc: PDFKit.PDFDocument, color = rule) {
    doc
      .moveTo(page.left, doc.y)
      .lineTo(page.right, doc.y)
      .lineWidth(color === rule ? 0.5 : 0.75)
      .strokeColor(color)
      .stroke()
  }
}
