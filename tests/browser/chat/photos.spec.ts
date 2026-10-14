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
    route,
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
    const page = await visit(route('inbox', [], { qs: { order: order.id } }))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    // The customer's messages sit on the other side under their name and initials.
    const customerMessage = page.locator('[data-from="theirs"]')
    await customerMessage.getByText('Can I get a shipping label?', { exact: true }).waitFor()
    await customerMessage.getByText('CC', { exact: true }).waitFor()
    await customerMessage.getByText('Casey Customer', { exact: true }).waitFor()
    await page.getByText('Today', { exact: true }).waitFor()

    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add photos', exact: true }).click()
    const fileChooser = await chooser
    await fileChooser.setFiles({ name: 'label.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('img', { name: 'label.png', exact: true }).waitFor()
    await page
      .getByPlaceholder('Reply to the customer…', { exact: true })
      .fill('Here is your shipping label')
    await page.getByRole('button', { name: 'Remove label.png', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Send prompt', exact: true }).click()

    await page.getByText('Here is your shipping label', { exact: true }).waitFor()
    const message = await OrderMessage.query()
      .where('order_id', order.id)
      .where('sender_role', 'staff')
      .firstOrFail()
    const [link] = await message.images.all()
    const photo = page.locator(
      `img[src="${route('chat.images.show', { orderId: order.id, id: link.attachmentId })}"]`
    )
    await photo.waitFor()
    // The browser decoded the bytes served by the authorized chat route. decode() waits for the
    // image to load, which can finish after the element is attached.
    assert.isTrue(
      await photo.evaluate(async (element) => {
        const image = element as unknown as { decode(): Promise<void>; naturalWidth: number }
        await image.decode()
        return image.naturalWidth > 0
      })
    )
    assert.equal(
      await page.getByRole('button', { name: 'Remove label.png', exact: true }).count(),
      0
    )
    // The photo opens in a viewer on the page.
    await page.getByRole('button', { name: 'View label.png', exact: true }).click()
    const viewer = page.getByRole('dialog', { name: 'label.png', exact: true })
    await viewer.getByRole('img', { name: 'label.png', exact: true }).waitFor()
    await viewer.getByRole('button', { name: 'Close', exact: true }).click()
    await viewer.waitFor({ state: 'detached' })

    // A photo with an empty text box sends with Enter too.
    const nextChooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Add photos', exact: true }).click()
    const nextFileChooser = await nextChooser
    await nextFileChooser.setFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png })
    await page.getByRole('button', { name: 'Remove receipt.png', exact: true }).waitFor()
    await page.getByPlaceholder('Reply to the customer…', { exact: true }).press('Enter')
    await page
      .getByRole('button', { name: 'Remove receipt.png', exact: true })
      .waitFor({ state: 'detached' })
    const photoOnly = await OrderMessage.query()
      .where('order_id', order.id)
      .where('body', '')
      .firstOrFail()
    const [receipt] = await photoOnly.images.all()
    await page
      .locator(
        `img[src="${route('chat.images.show', { orderId: order.id, id: receipt.attachmentId })}"]`
      )
      .waitFor()
    // A photo without text is no empty bubble; only the latest message carries the receipt.
    assert.equal(
      await page
        .locator('[data-from="mine"]')
        .getByText(/· (Sent|Seen)$/)
        .count(),
      1
    )
    assert.equal(await page.getByRole('button', { name: 'Copy message', exact: true }).count(), 1)
    assert.deepEqual(errors, [])
  })
})
