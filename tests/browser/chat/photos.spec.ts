import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import { OrderFactory } from '#database/factories/order_factory'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
  'base64'
)

test.group('Order chat photos', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff send photos with or without a caption and see them in the thread', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const customer = await User.create({
      email: 'buyer@example.com',
      fullName: 'Casey Customer',
      password: 'secret-password',
      role: 'customer',
    })
    const staff = await User.create({
      email: 'staff@example.com',
      fullName: 'Sam Staff',
      password: 'secret-password',
      role: 'staff',
    })
    const order = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
    }).create()
    await OrderMessage.create({
      publicId: randomUUID(),
      orderId: order.id,
      senderId: customer.id,
      senderRole: 'customer',
      senderName: 'Casey Customer',
      body: 'Can I get a shipping label?',
    })
    await browserContext.loginAs(staff)
    const page = await visit(`/inbox?order=${order.id}`)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    // The customer's messages carry their initials.
    const customerMessage = page.locator('[data-role="assistant"]')
    await customerMessage.getByText('Can I get a shipping label?').waitFor()
    await customerMessage.getByText('CC', { exact: true }).waitFor()

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add photos' }).click()
    const fileChooser = await chooser
    await fileChooser.setFiles({ name: 'label.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('img', { name: 'label.png' }).waitFor()
    await page.getByPlaceholder('Reply to the customer…').fill('Here is your shipping label')
    await page.getByRole('button', { name: 'Remove label.png' }).waitFor()
    await page.getByRole('button', { name: 'Send prompt' }).click()

    await page.getByText('Here is your shipping label').waitFor()
    const message = await OrderMessage.query()
      .where('order_id', order.id)
      .where('sender_role', 'staff')
      .firstOrFail()
    const [link] = await message.images.all()
    const photo = page.locator(`img[src="/chat/orders/${order.id}/images/${link.attachmentId}"]`)
    await photo.waitFor()
    // The browser decoded the bytes served by the authorized chat route.
    assert.isTrue(
      await photo.evaluate((image) => (image as { naturalWidth: number }).naturalWidth > 0)
    )
    assert.equal(await page.getByRole('button', { name: 'Remove label.png' }).count(), 0)

    // A photo with an empty text box sends with Enter too.
    const nextChooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add photos' }).click()
    const nextFileChooser = await nextChooser
    await nextFileChooser.setFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('button', { name: 'Remove receipt.png' }).waitFor()
    await page.getByPlaceholder('Reply to the customer…').press('Enter')
    await page.getByRole('button', { name: 'Remove receipt.png' }).waitFor({ state: 'detached' })
    const photoOnly = await OrderMessage.query()
      .where('order_id', order.id)
      .where('body', '')
      .firstOrFail()
    const [receipt] = await photoOnly.images.all()
    await page
      .locator(`img[src="/chat/orders/${order.id}/images/${receipt.attachmentId}"]`)
      .waitFor()
    assert.deepEqual(errors, [])
  })
})
