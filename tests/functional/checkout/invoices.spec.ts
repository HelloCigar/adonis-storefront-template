import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import Notification from '#models/checkout/notification'
import InvoiceService from '#services/checkout/invoice_service'
import NotificationService from '#services/checkout/notification_service'
import OrderNotification from '#mails/checkout/order_notification'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { order, isPdf } from '#tests/helpers/invoices'

test.group('Invoices', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a paid order’s invoice downloads as a PDF for whoever may view the order', async ({
    client,
    assert,
    route,
  }) => {
    const { order: paid, grant } = await order()
    const request = client
      .get(route('checkout.invoices.show', { publicId: paid.publicId! }))
      .withSession({ store_order_grants: { [paid.publicId!]: grant } })
    // Keep the PDF bytes; the client only parses text and JSON bodies by default.
    request.request.buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => done(null, Buffer.concat(chunks)))
    })
    const response = await request
    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    response.assertHeader(
      'content-disposition',
      `attachment; filename="invoice-${paid.number}.pdf"`
    )
    response.assertHeader('cache-control', 'private, no-store')
    assert.isTrue(isPdf(response.body()))
  })

  test('the invoice stays private and only exists once payment settled', async ({
    client,
    route,
  }) => {
    const { order: paid } = await order()
    const outsider = await UserFactory.create()
    const anonymous = await client.get(
      route('checkout.invoices.show', { publicId: paid.publicId! })
    )
    anonymous.assertStatus(404)
    const stranger = await client
      .get(route('checkout.invoices.show', { publicId: paid.publicId! }))
      .loginAs(outsider)
    stranger.assertStatus(404)

    const { order: unpaid, grant } = await order(null)
    const pending = await client
      .get(route('checkout.invoices.show', { publicId: unpaid.publicId! }))
      .withSession({ store_order_grants: { [unpaid.publicId!]: grant } })
    pending.assertStatus(404)
  })

  test('the order page offers the invoice once the order is paid', async ({
    client,
    assert,
    route,
  }) => {
    const customer = await UserFactory.create()
    const { order: paid } = await order()
    paid.userId = customer.id
    await paid.save()
    const page = await client
      .get(route('checkout.orders.show', { publicId: paid.publicId! }))
      .loginAs(customer)
      .withInertia()
    page.assertStatus(200)
    assert.isTrue(page.inertiaProps.hasInvoice)

    const { order: unpaid } = await order(null)
    unpaid.userId = customer.id
    await unpaid.save()
    const pending = await client
      .get(route('checkout.orders.show', { publicId: unpaid.publicId! }))
      .loginAs(customer)
      .withInertia()
    assert.isFalse(pending.inertiaProps.hasInvoice)
  })

  test('renders long orders across pages with every line kept', async ({ assert }) => {
    const created = await OrderFactory.merge({
      publicId: randomUUID(),
      source: 'online',
      paidAt: DateTime.utc(),
      discountCode: 'WELCOME10',
    })
      .with('lineItems', 40, (line) => line.merge({ title: 'Linen Throw Pillow — Sand' }))
      .with('addresses', 2)
      .create()
    const invoices = await app.container.make(InvoiceService)
    const pdf = await invoices.render(created)
    assert.isTrue(isPdf(pdf))
    const pages = pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []
    assert.isAbove(pages.length, 1)
  })

  test('the receipt email attaches the invoice; later emails do not', async ({ assert }) => {
    using fakeMail = mail.fake()
    const { order: paid } = await order()
    const notifications = await app.container.make(NotificationService)
    const receipt = await Notification.create({
      orderId: paid.id,
      kind: 'receipt',
      state: 'pending',
    })
    const shipment = await Notification.create({
      orderId: paid.id,
      kind: 'shipment',
      state: 'pending',
    })
    await notifications.run(receipt.id)
    await notifications.run(shipment.id)

    fakeMail.mails.assertSentCount(2)
    // attachData() files are not searchable with assertAttachment, so read the message itself.
    const attachments = (subject: string) =>
      fakeMail.mails
        .sent((sent) => sent.message.hasSubject(subject))
        .flatMap((sent) => sent.message.toJSON().message.attachments ?? [])
    const [invoice, ...others] = attachments(`Payment received · ${paid.number}`)
    assert.isEmpty(others)
    assert.equal(invoice.filename, `invoice-${paid.number}.pdf`)
    assert.equal(invoice.contentType, 'application/pdf')
    // The fake mailer stores attachment bytes base64 encoded.
    assert.isTrue(isPdf(Buffer.from(String(invoice.content), 'base64')))
    assert.isEmpty(attachments(`Your order has shipped · ${paid.number}`))
    fakeMail.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertTextIncludes('Your invoice is attached.')
      return message.hasSubject(`Payment received · ${paid.number}`)
    })
  })
})
