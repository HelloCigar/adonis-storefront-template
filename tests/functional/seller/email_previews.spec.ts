import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import mail from '@adonisjs/mail/services/main'
import User, { type UserRole } from '#models/account/user'
import Order from '#models/checkout/order'
import AccessGrant from '#models/checkout/access_grant'

const account = (role: UserRole) =>
  User.create({
    email: `${role}@example.com`,
    role,
    fullName: role,
    password: 'secret-password',
  })

test.group('Email previews', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff preview every order email with sample data and nothing is sent or stored', async ({
    client,
    assert,
    route,
  }) => {
    using fakeMail = mail.fake()
    const staff = await account('staff')

    const index = await client.get(route('seller.emails.index')).loginAs(staff).withInertia()
    index.assertStatus(200)
    index.assertInertiaComponent('seller/emails')
    const { emails, preview } = index.inertiaProps
    assert.deepEqual(
      emails.map((email: { key: string }) => email.key),
      ['receipt', 'shipment', 'shipment-untracked', 'delivery']
    )
    assert.notProperty(emails[0], 'html')
    assert.equal(preview.key, 'receipt')
    assert.match(preview.subject, /^Payment received · MB-/)
    assert.equal(preview.to, 'maria.santos@example.com')
    const from = mail.config.from as { address: string; name: string }
    assert.equal(preview.from, `${from.name} <${from.address}>`)
    assert.include(preview.html, mail.config.globals!.brandName)
    assert.include(preview.html, '₱2,008.00')
    assert.include(preview.html, '/checkout/orders/')
    assert.include(preview.text, '₱2,008.00')

    const shipped = await client
      .get(route('seller.emails.show', { email: 'shipment' }))
      .loginAs(staff)
      .withInertia()
    assert.match(shipped.inertiaProps.preview.subject, /^Your order has shipped/)
    assert.include(shipped.inertiaProps.preview.html, 'MC-2026-004812')
    assert.include(shipped.inertiaProps.preview.html, 'https://tracking.example/MC-2026-004812')

    const untracked = await client
      .get(route('seller.emails.show', { email: 'shipment-untracked' }))
      .loginAs(staff)
      .withInertia()
    assert.include(untracked.inertiaProps.preview.html, 'Your parcel has left the store.')
    assert.notInclude(untracked.inertiaProps.preview.html, 'Tracking number')

    const delivered = await client
      .get(route('seller.emails.show', { email: 'delivery' }))
      .loginAs(staff)
      .withInertia()
    assert.match(delivered.inertiaProps.preview.subject, /^Your order was delivered/)
    assert.include(delivered.inertiaProps.preview.html, 'Delivered to')

    fakeMail.mails.assertNoneSent()
    fakeMail.mails.assertNoneQueued()
    assert.lengthOf(await Order.all(), 0)
    assert.lengthOf(await AccessGrant.all(), 0)
  })

  test('unknown previews are not found', async ({ client, route }) => {
    const admin = await account('admin')
    for (const key of ['missing', 'constructor', 'toString']) {
      const response = await client
        .get(route('seller.emails.show', { email: key }))
        .loginAs(admin)
        .accept('json')
      response.assertStatus(404)
    }
  })

  test('customers and guests cannot open email previews', async ({ client, route }) => {
    const customer = await account('customer')
    const denied = await client
      .get(route('seller.emails.show', { email: 'receipt' }))
      .loginAs(customer)
      .accept('json')
    denied.assertStatus(403)
    const guest = await client.get(route('seller.emails.index')).redirects(0)
    guest.assertHeader('location', route('session.create'))
  })
})
