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

  test('staff attach a photo with a caption and see it in the thread', async ({
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
    await browserContext.loginAs(staff)
    const page = await visit(`/inbox?order=${order.id}`)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('button', { name: 'Accept', exact: true }).click()

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add photos' }).click()
    const fileChooser = await chooser
    await fileChooser.setFiles({ name: 'label.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('img', { name: 'label.png' }).waitFor()
    await page.getByPlaceholder('Reply to the customer…').fill('Here is your shipping label')
    await page.getByRole('button', { name: 'Remove label.png' }).waitFor()
    await page.locator('form button[type="submit"]').click()

    await page.getByText('Here is your shipping label').waitFor()
    const message = await OrderMessage.findByOrFail('order_id', order.id)
    const [link] = await message.images.all()
    const photo = page.locator(`img[src="/chat/orders/${order.id}/images/${link.attachmentId}"]`)
    await photo.waitFor()
    // The browser decoded the bytes served by the authorized chat route.
    assert.isTrue(
      await photo.evaluate((image) => (image as { naturalWidth: number }).naturalWidth > 0)
    )
    assert.equal(await page.getByRole('button', { name: 'Remove label.png' }).count(), 0)
    assert.deepEqual(errors, [])
  })
})
