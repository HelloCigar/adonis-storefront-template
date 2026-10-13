import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import ace from '@adonisjs/core/services/ace'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import Order from '#models/checkout/order'
import { DateTime } from 'luxon'
import MakeAdmin from '../../../commands/make_admin.js'
import MakeStaff from '../../../commands/make_staff.js'
import MakeSeller from '../../../commands/make_seller.js'
import StaffRoleMigration from '#database/migrations/1791000000000_use_staff_role_for_single_store'
import { finishedStoreSetup } from '#tests/helpers/store_setup'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { account } from '#tests/helpers/accounts'

test.group('Single store authorization', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signup remains customer-only and login sends each role to its own area', async ({
    client,
    assert,
    route,
  }) => {
    // @ts-ignore -- the fake keeps the signup mail away from a real mailbox
    using mails = mail.fake()

    const signup = await client
      .post(urlFor('new_account.store'))
      .withCsrfToken()
      .redirects(0)
      .json({
        fullName: 'Customer',
        email: 'new@example.com',
        password: 'secret-password',
        passwordConfirmation: 'secret-password',
        role: 'admin',
      })
    signup.assertStatus(302)
    signup.assertHeader('location', route('email_verifications.create'))
    const registered = await User.findByOrFail('email', 'new@example.com')
    assert.equal(registered.role, 'customer')
    for (const role of ['customer', 'staff', 'admin'] as const) {
      const user = await account(`${role}@example.com`, role)
      const login = await client
        .post(urlFor('session.store'))
        .withCsrfToken()
        .redirects(0)
        .json({ email: user.email, password: 'secret-password' })
      login.assertStatus(302)
      login.assertHeader(
        'location',
        role === 'customer' ? route('account.show') : route('dashboard')
      )
    }
  })

  test('customers cannot enter store management and only admins reach real member management', async ({
    client,
    assert,
    route,
  }) => {
    const customer = await account('customer@example.com')
    const staff = await account('staff@example.com', 'staff')
    const admin = await account('admin@example.com', 'admin')
    // A finished store, so the admin's dashboard request reaches the dashboard, not store setup.
    await finishedStoreSetup()
    for (const name of [
      'dashboard',
      'inbox',
      'settings.members',
      'seller.products.index',
    ] as const) {
      const guest = await client.get(route(name)).redirects(0)
      guest.assertStatus(302)
      guest.assertHeader('location', route('session.create'))
      const denied = await client.get(route(name)).loginAs(customer).accept('json')
      denied.assertStatus(403)
    }
    for (const actor of [staff, admin]) {
      for (const name of ['dashboard', 'inbox', 'seller.products.index'] as const) {
        const page = await client.get(route(name)).loginAs(actor).withInertia()
        page.assertStatus(200)
        assert.isTrue(page.inertiaProps.permissions.manageStore)
        assert.equal(page.inertiaProps.permissions.manageUsers, actor.role === 'admin')
      }
    }
    const denied = await client.get(route('settings.members')).loginAs(staff).accept('json')
    denied.assertStatus(403)
    const members = await client.get(route('settings.members')).loginAs(admin).redirects(0)
    members.assertStatus(302)
    members.assertHeader('location', route('seller.users.index'))
    await staff.merge({ role: 'customer' }).save()
    const revoked = await client.get(route('dashboard')).loginAs(staff).accept('json')
    revoked.assertStatus(403)
  })

  test('personal addresses and orders stay private even from staff and admins', async ({
    client,
    assert,
    route,
  }) => {
    const owner = await account('owner@example.com')
    const address = await owner
      .related('addresses')
      .create({ address1: '10 Street', city: 'Manila', countryCode: 'PH', postalCode: '1000' })
    const order = await Order.create({
      number: 'PRIVATE',
      userId: owner.id,
      email: owner.email,
      currencyCode: 'PHP',
      financialStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      totalMinor: 10000,
      processedAt: DateTime.utc(),
    })
    for (const role of ['customer', 'staff', 'admin'] as const) {
      const actor = await account(`${role}@example.com`, role)
      const deniedOrder = await client
        .get(route('orders.show', { id: order.id }))
        .loginAs(actor)
        .withInertia()
      deniedOrder.assertStatus(404)
      const deniedAddress = await client
        .delete(urlFor('account.addresses.delete', { id: address.id }))
        .loginAs(actor)
        .withCsrfToken()
        .accept('json')
      deniedAddress.assertStatus(404)
      const ownSettings = await client.get(route('settings')).loginAs(actor).withInertia()
      ownSettings.assertStatus(200)
      const ownAccount = await client.get(route('account.show')).loginAs(actor).withInertia()
      ownAccount.assertStatus(200)
    }
    assert.isNotNull(await owner.related('addresses').query().where('id', address.id).first())
  })

  test('admin bootstrap and staff commands preserve administrators, including the legacy alias', async ({
    assert,
  }) => {
    const user = await account('bootstrap@example.com')
    const promote = await ace.create(MakeAdmin, [user.email])
    await promote.exec()
    promote.assertSucceeded()
    await user.refresh()
    assert.equal(user.role, 'admin')
    for (const Command of [MakeStaff, MakeSeller]) {
      const preserve = await ace.create(Command, [user.email])
      await preserve.exec()
      preserve.assertSucceeded()
      await user.refresh()
      assert.equal(user.role, 'admin')
      const staff = await account(`${Command.commandName.replaceAll(':', '-')}@example.com`)
      const grant = await ace.create(Command, [staff.email])
      await grant.exec()
      grant.assertSucceeded()
      await staff.refresh()
      assert.equal(staff.role, 'staff')
    }
    const missing = await ace.create(MakeAdmin, ['missing@example.com'])
    await missing.exec()
    missing.assertFailed()
  })

  test('role migration preserves existing accounts and can be reversed', async ({ assert }) => {
    const formerSeller = await account('former@example.com')
    await db.from('users').where('id', formerSeller.id).update({ role: 'seller' })
    const customer = await account('customer@example.com')
    const admin = await account('admin@example.com', 'admin')
    await new StaffRoleMigration(db.connection(), 'staff-role').execUp()
    await formerSeller.refresh()
    await customer.refresh()
    await admin.refresh()
    assert.equal(formerSeller.role, 'staff')
    assert.equal(customer.role, 'customer')
    assert.equal(admin.role, 'admin')
    await new StaffRoleMigration(db.connection(), 'staff-role').execDown()
    const reverted = await db.from('users').where('id', formerSeller.id).first()
    assert.equal(reverted.role, 'seller')
    await new StaffRoleMigration(db.connection(), 'staff-role').execUp()
    await formerSeller.refresh()
    assert.equal(formerSeller.role, 'staff')
  })
})
