import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import Order from '#models/checkout/order'
import { DateTime } from 'luxon'

test.group('Store management pages', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('creates products and variants, edits and deletes through Inertia forms', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const seller = await User.create({
      fullName: 'Owner',
      email: 'owner@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    await browserContext.loginAs(seller)
    const page = await visit('/seller/products')
    const errors: string[] = []
    const requests: { url: string; inertia?: string; navigation: boolean }[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', async (request) => {
      if (new URL(request.url()).pathname.startsWith('/seller/')) {
        const headers = await request.allHeaders()
        requests.push({
          url: request.url(),
          inertia: headers['x-inertia'],
          navigation: request.isNavigationRequest(),
        })
      }
    })
    await page.getByRole('button', { name: 'Add product', exact: true }).click()
    await page.getByLabel('Title', { exact: true }).fill('Browser Lamp')
    await page.getByLabel('Handle', { exact: true }).fill('browser-lamp')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('button', { name: 'Add variant', exact: true }).waitFor()
    const product = await Product.findByOrFail('handle', 'browser-lamp')
    await page.assertPath(`/seller/products/${product.id}/variants`)
    await page.getByRole('button', { name: 'Add variant', exact: true }).click()
    await page.getByLabel('Price', { exact: true }).fill('499')
    await page.getByLabel('Stock quantity', { exact: true }).fill('10')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('cell', { name: 'Default', exact: true }).first().waitFor()
    const variant = await product.related('variants').query().firstOrFail()
    assert.equal(variant.priceAmount, 499)
    assert.equal(variant.inventoryQuantity, 10)
    await page.getByRole('button', { name: 'Images', exact: true }).click()
    await page.assertDisabled(page.getByRole('button', { name: 'Upload images', exact: true }))
    await page.getByLabel('Choose images', { exact: true }).setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Not an image'),
    })
    await page.getByRole('button', { name: 'Upload images', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Product images', exact: true })
      .locator('[data-slot="error"]')
      .waitFor()
    await page.getByLabel('Choose images', { exact: true }).setInputFiles({
      name: 'lamp.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
        'base64'
      ),
    })
    await page.getByRole('button', { name: 'Upload images', exact: true }).click()
    await page.getByRole('img', { name: 'lamp.png', exact: true }).waitFor()
    await page.assertDisabled(page.getByRole('button', { name: 'Upload images', exact: true }))
    assert.equal(await page.getByLabel('Choose images', { exact: true }).inputValue(), '')
    await page.getByRole('button', { name: 'Remove image 1', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('img', { name: 'lamp.png', exact: true }).waitFor({ state: 'detached' })
    await page
      .getByRole('dialog', { name: 'Product images', exact: true })
      .getByRole('button', { name: 'Close', exact: true })
      .click()
    await page.getByRole('button', { name: 'Actions for Default', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Edit variant', exact: true }).click()
    await page.getByLabel('Price', { exact: true }).fill('599')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    await variant.refresh()
    assert.equal(variant.priceAmount, 599)
    await page.getByRole('link', { name: 'Products', exact: true }).last().click()
    await page.getByRole('button', { name: /Actions for Browser Lamp/ }).click()
    await page.getByRole('menuitem', { name: 'Manage variants', exact: true }).click()
    await page.getByRole('cell', { name: 'Default', exact: true }).first().waitFor()
    await page.assertPath(`/seller/products/${product.id}/variants`)
    await page.getByRole('button', { name: 'Actions for Default', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Delete variant', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByText('No variants found', { exact: true }).waitFor()
    await page.getByRole('link', { name: 'Products', exact: true }).last().click()
    await page.getByRole('button', { name: /Actions for Browser Lamp/ }).click()
    await page.getByRole('menuitem', { name: 'Edit product', exact: true }).click()
    await page.getByLabel('Title', { exact: true }).fill('Updated Lamp')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText('Updated Lamp', { exact: true }).waitFor()
    await page.getByRole('button', { name: /Actions for Updated Lamp/ }).click()
    await page.getByRole('menuitem', { name: 'Delete product', exact: true }).click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByText('No products found', { exact: true }).waitFor()
    assert.isNull(await Product.find(product.id))
    assert.deepEqual(errors, [])
    assert.isAtLeast(requests.length, 6)
    assert.deepEqual(
      requests.filter((request) => request.inertia !== 'true' || request.navigation),
      []
    )
    await page.screenshot({ path: 'tmp/seller-products.png', fullPage: true })
  })

  test('shows validation, searches and paginates users, and creates a collection', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const seller = await User.create({
      fullName: 'Owner',
      email: 'owner@example.com',
      password: 'secret-password',
      role: 'admin',
    })
    await User.createMany(
      Array.from({ length: 12 }, (_, index) => ({
        fullName: `Buyer ${index}`,
        email: `buyer${index}@example.com`,
        password: 'secret-password',
      }))
    )
    await browserContext.loginAs(seller)
    const page = await visit('/seller/users')
    await page.getByRole('button', { name: /next page/i }).click()
    await page.screenshot({ path: 'tmp/seller-users-page2.png', fullPage: true })
    await page.getByRole('cell', { name: 'Owner', exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'Search users', exact: true }).fill('buyer11')
    await page.getByRole('cell', { name: 'buyer11@example.com', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Add user', exact: true }).click()
    await page.getByLabel('Full name', { exact: true }).fill('Duplicate buyer')
    await page.getByLabel('Email', { exact: true }).fill('buyer11@example.com')
    await page.getByLabel('Password', { exact: true }).fill('secret-password')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText(/email.*already.*taken/i).waitFor()
    await page.getByLabel('Email', { exact: true }).fill('new-buyer@example.com')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    assert.isNotNull(await User.findBy('email', 'new-buyer@example.com'))
    await page.getByRole('link', { name: 'Collections', exact: true }).click()
    await page.getByRole('button', { name: 'Add collection', exact: true }).click()
    await page.getByLabel('Title', { exact: true }).fill('Desk Friends')
    await page.getByLabel('Handle', { exact: true }).fill('desk-friends')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('cell', { name: 'Desk Friends', exact: true }).waitFor()
    await page.screenshot({ path: 'tmp/seller-collections.png', fullPage: true })
  })

  test('opens order details and saves fulfillment changes', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const seller = await User.create({
      email: 'owner@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const order = await Order.create({
      number: 'MB-1001',
      email: 'buyer@example.com',
      currencyCode: 'PHP',
      financialStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      subtotalMinor: 49900,
      totalMinor: 49900,
      processedAt: DateTime.utc(),
    })
    await order.related('lineItems').create({
      sellerId: seller.id,
      title: 'Bunny Lamp',
      quantity: 1,
      unitPriceMinor: 49900,
      totalMinor: 49900,
      currencyCode: 'PHP',
    })
    await browserContext.loginAs(seller)
    const page = await visit('/seller/orders')
    await page.getByRole('button', { name: /Actions for MB-1001/ }).click()
    await page.getByRole('menuitem', { name: 'View order', exact: true }).click()
    await page.getByRole('cell', { name: /Bunny Lamp/ }).waitFor()
    await page.getByLabel('Fulfillment status', { exact: true }).click()
    await page.getByRole('option', { name: 'Fulfilled', exact: true }).click()
    await page.getByLabel('Note', { exact: true }).fill('Shipped')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.getByText('Order updated', { exact: true }).waitFor()
    await order.refresh()
    assert.equal(order.financialStatus, 'paid')
    assert.equal(order.fulfillmentStatus, 'fulfilled')
    assert.equal(order.note, 'Shipped')
    assert.equal(order.totalAmount, 499)
    await page.getByLabel('Note', { exact: true }).fill('')
    const clearedNote = page.waitForResponse(
      (response) =>
        ['PUT', 'PATCH'].includes(response.request().method()) &&
        new URL(response.url()).pathname === `/seller/orders/${order.id}`
    )
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await clearedNote
    await order.refresh()
    assert.isNull(order.note)
    await page.screenshot({ path: 'tmp/seller-order.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.isTrue(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    await page.screenshot({ path: 'tmp/seller-order-mobile.png', fullPage: true })
  })

  test('admins see store navigation and can create admin accounts', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Administrator',
      email: 'admin@example.com',
      password: 'secret-password',
      role: 'admin',
    })
    await browserContext.loginAs(admin)
    const page = await visit('/dashboard')
    await page.getByRole('link', { name: 'Products', exact: true }).waitFor()
    await page.getByRole('link', { name: 'Users', exact: true }).click()
    await page.getByRole('button', { name: 'Add user', exact: true }).click()
    await page.getByLabel('Full name', { exact: true }).fill('Second Admin')
    await page.getByLabel('Email', { exact: true }).fill('second-admin@example.com')
    await page.getByLabel('Password', { exact: true }).fill('secret-password')
    await page.getByLabel('Role', { exact: true }).click()
    await page.getByRole('option', { name: 'Admin', exact: true }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByRole('cell', { name: 'Second Admin', exact: true }).waitFor()
    const secondAdmin = await User.findByOrFail('email', 'second-admin@example.com')
    assert.equal(secondAdmin.role, 'admin')
    await page.getByRole('button', { name: /Actions for Administrator/ }).click()
    await page.getByRole('menuitem', { name: 'Edit user', exact: true }).click()
    await page.assertDisabled(page.getByLabel('Role', { exact: true }))
    await page.screenshot({ path: 'tmp/seller-admin-user.png', fullPage: true })
  })

  test('staff see catalog navigation but global user management stays hidden', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const owner = await User.create({
      fullName: 'Staff',
      email: 'seller@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    await browserContext.loginAs(owner)
    const page = await visit('/dashboard')
    await page.getByRole('link', { name: 'Products', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Users', exact: true }).count(), 0)
    await page.getByRole('link', { name: 'Products', exact: true }).click()
    await page.getByRole('button', { name: 'Add product', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Users', exact: true }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Members', exact: true }).count(), 0)
    await page.getByRole('link', { name: 'Store management', exact: true }).waitFor()
    await page.screenshot({ path: 'tmp/store-staff-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.isTrue(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    await page.screenshot({ path: 'tmp/store-staff-mobile.png', fullPage: true })
  })

  test('customers use storefront account settings and can save their profile', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const customer = await User.create({
      fullName: 'Customer',
      email: 'customer@example.com',
      password: 'secret-password',
      role: 'customer',
    })
    await browserContext.loginAs(customer)
    const page = await visit('/settings')
    await page.getByRole('heading', { name: 'Account settings', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Store management', exact: true }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Users', exact: true }).count(), 0)
    assert.equal(await page.getByRole('link', { name: 'Members', exact: true }).count(), 0)
    await page.getByLabel('Name', { exact: true }).fill('Updated Customer')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.getByText('Profile updated', { exact: true }).waitFor()
    await customer.refresh()
    assert.equal(customer.fullName, 'Updated Customer')
    assert.equal(customer.role, 'customer')
    await page.screenshot({ path: 'tmp/customer-settings-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'tmp/customer-settings-mobile.png', fullPage: true })
    assert.isTrue(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    await page.getByRole('link', { name: 'Security', exact: true }).click()
    await page.getByLabel('Current password', { exact: true }).waitFor()
    await page.assertPath('/settings/security')
  })
})
