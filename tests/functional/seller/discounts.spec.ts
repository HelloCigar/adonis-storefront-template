import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import DiscountCode from '#models/checkout/discount_code'

const staff = () =>
  User.create({
    fullName: 'Store Staff',
    email: 'staff@example.com',
    password: 'secret-password',
    role: 'staff',
  })
const percentPayload = {
  code: 'spring10',
  description: 'Spring sale',
  kind: 'percentage',
  percentOff: 10,
  amountOff: null,
  minimumSubtotal: 500,
  usageLimit: 50,
  oncePerCustomer: true,
  active: true,
  startsAt: null,
  endsAt: null,
}
const fixedPayload = {
  ...percentPayload,
  code: 'LESS100',
  kind: 'fixed',
  percentOff: null,
  amountOff: 100.5,
}
const countDiscounts = async () => {
  const codes = await DiscountCode.all()
  return codes.length
}

test.group('Seller discounts', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('only staff can view and manage discount codes', async ({ client, assert }) => {
    const customer = await User.create({
      email: 'customer@example.com',
      password: 'secret-password',
    })
    await customer.refresh()
    assert.equal(customer.role, 'customer')
    const owner = await staff()

    const guest = await client.get('/seller/discounts').redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', '/login')

    const deniedGet = await client.get('/seller/discounts').loginAs(customer).accept('json')
    deniedGet.assertStatus(403)

    const deniedPost = await client
      .post('/seller/discounts')
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json(percentPayload)
    deniedPost.assertStatus(403)
    assert.equal(await countDiscounts(), 0)

    const page = await client.get('/seller/discounts').loginAs(owner).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('seller/discounts')
    assert.deepEqual(page.inertiaProps.discounts, [])
  })

  test('staff create a code stored upper case in centavos', async ({ client, assert }) => {
    const owner = await staff()

    const percent = await client
      .post('/seller/discounts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(percentPayload)
    percent.assertRedirectsTo('/seller/discounts')
    const spring = await DiscountCode.findByOrFail('code', 'SPRING10')
    assert.equal(spring.percentOff, 10)
    assert.isNull(spring.amountOffMinor)
    assert.equal(spring.minimumSubtotalMinor, 50000)
    assert.equal(spring.usageLimit, 50)
    assert.isTrue(spring.oncePerCustomer)
    assert.isTrue(spring.active)
    assert.equal(spring.createdById, owner.id)
    assert.equal(spring.timesUsed, 0)

    const fixed = await client
      .post('/seller/discounts')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(fixedPayload)
    fixed.assertRedirectsTo('/seller/discounts')
    const less = await DiscountCode.findByOrFail('code', 'LESS100')
    assert.equal(less.amountOffMinor, 10050)
    assert.isNull(less.percentOff)

    const list = await client.get('/seller/discounts').loginAs(owner).withInertia()
    list.assertInertiaComponent('seller/discounts')
    assert.lengthOf(list.inertiaProps.discounts, 2)
    const listed = list.inertiaProps.discounts.find(
      (discount: { code: string }) => discount.code === 'SPRING10'
    )
    assert.exists(listed)
    assert.isTrue(listed.can.delete)
  })

  test('rejects duplicate codes, a missing amount and an end before the start', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    await DiscountCode.create({
      code: 'SPRING10',
      kind: 'percentage',
      percentOff: 10,
      minimumSubtotalMinor: 0,
      timesUsed: 0,
      oncePerCustomer: false,
      active: true,
    })
    assert.equal(await countDiscounts(), 1)

    const duplicate = await client
      .post('/seller/discounts')
      .loginAs(owner)
      .withCsrfToken()
      .header('referer', '/seller/discounts')
      .redirects(0)
      .json(percentPayload)
    duplicate.assertStatus(302)
    assert.property(duplicate.flashMessages().inputErrorsBag, 'code')
    assert.equal(await countDiscounts(), 1)

    const missingAmount = await client
      .post('/seller/discounts')
      .loginAs(owner)
      .withCsrfToken()
      .header('referer', '/seller/discounts')
      .redirects(0)
      .json({ ...fixedPayload, code: 'FIXED5', amountOff: null })
    missingAmount.assertStatus(302)
    assert.property(missingAmount.flashMessages().inputErrorsBag, 'amountOff')
    assert.equal(await countDiscounts(), 1)

    const endsFirst = await client
      .post('/seller/discounts')
      .loginAs(owner)
      .withCsrfToken()
      .header('referer', '/seller/discounts')
      .redirects(0)
      .json({
        ...percentPayload,
        code: 'WINDOW10',
        startsAt: '2026-10-10T00:00:00.000Z',
        endsAt: '2026-10-09T00:00:00.000Z',
      })
    endsFirst.assertStatus(302)
    assert.property(endsFirst.flashMessages().inputErrorsBag, 'endsAt')
    assert.equal(await countDiscounts(), 1)
    assert.isNull(await DiscountCode.findBy('code', 'WINDOW10'))
  })

  test('staff update a code and delete only unused codes', async ({ client, assert }) => {
    const owner = await staff()
    const discount = await DiscountCode.create({
      code: 'SPRING10',
      kind: 'percentage',
      percentOff: 10,
      minimumSubtotalMinor: 0,
      timesUsed: 0,
      oncePerCustomer: false,
      active: true,
    })

    const updated = await client
      .patch(`/seller/discounts/${discount.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...percentPayload, code: 'FALL20', percentOff: 20, active: false })
    updated.assertRedirectsTo('/seller/discounts')
    await discount.refresh()
    assert.equal(discount.code, 'FALL20')
    assert.equal(discount.percentOff, 20)
    assert.isFalse(discount.active)

    const used = await DiscountCode.create({
      code: 'USED10',
      kind: 'percentage',
      percentOff: 10,
      minimumSubtotalMinor: 0,
      timesUsed: 1,
      oncePerCustomer: false,
      active: true,
    })
    const blocked = await client
      .delete(`/seller/discounts/${used.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    blocked.assertStatus(403)
    assert.isNotNull(await DiscountCode.find(used.id))

    const deleted = await client
      .delete(`/seller/discounts/${discount.id}`)
      .loginAs(owner)
      .withCsrfToken()
    deleted.assertRedirectsTo('/seller/discounts')
    assert.isNull(await DiscountCode.find(discount.id))
  })
})
