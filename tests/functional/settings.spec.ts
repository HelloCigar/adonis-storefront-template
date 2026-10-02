import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { AttachmentModel } from '@jrmc/adonis-attachment/lucid'
import hash from '@adonisjs/core/services/hash'
import User from '#models/account/user'
import { backfillUserAvatars } from '../../database/migrations/1790488097086_backfill_user_avatars.js'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

test.group('Account settings', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('updates the signed-in user profile', async ({ client, assert }) => {
    const user = await User.create({
      fullName: 'Old Name',
      email: 'profile@example.com',
      password: 'secret-password',
    })

    const response = await client
      .post('/settings')
      .loginAs(user)
      .withCsrfToken()
      .fields({ fullName: 'New Name', email: 'new@example.com' })

    response.assertRedirectsTo('/settings')
    await user.refresh()
    assert.equal(user.fullName, 'New Name')
    assert.equal(user.email, 'new@example.com')
  })

  test('creates, replaces, and removes an avatar without accepting invalid files', async ({
    client,
    assert,
  }) => {
    const user = await User.create({
      fullName: 'Avatar User',
      email: 'avatar@example.com',
      password: 'secret-password',
    })

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
      'base64'
    )
    const uploaded = await client
      .post('/settings')
      .loginAs(user)
      .withCsrfToken()
      .field('fullName', 'Avatar User')
      .field('email', 'avatar@example.com')
      .file('avatar', png, { filename: 'avatar.png', contentType: 'image/png' })

    uploaded.assertRedirectsTo('/settings')
    await user.refresh()
    const firstAvatar = await user.avatar.get()
    assert.isNotNull(firstAvatar)
    const attachments = await app.container.make('jrmc.attachment')
    assert.deepEqual(Buffer.from(await attachments.read(firstAvatar!.toAttachment())), png)
    const settingsPage = await client.get('/settings').loginAs(user).withInertia()
    settingsPage.assertInertiaComponent('settings/index')
    assert.include(settingsPage.inertiaProps.user.avatarUrl, firstAvatar!.attachmentId)
    const avatarResponse = await client.get(settingsPage.inertiaProps.user.avatarUrl)
    avatarResponse.assertStatus(200)
    avatarResponse.assertHeader('content-type', 'image/png')

    const replaced = await client
      .post('/settings')
      .loginAs(user)
      .withCsrfToken()
      .field('fullName', 'Avatar User')
      .field('email', 'avatar@example.com')
      .file('avatar', png, { filename: 'second.png', contentType: 'image/png' })
    replaced.assertRedirectsTo('/settings')
    const secondAvatar = await user.avatar.get()
    assert.isNotNull(secondAvatar)
    assert.notEqual(secondAvatar!.attachmentId, firstAvatar!.attachmentId)
    assert.isNull(await AttachmentModel.find(firstAvatar!.attachmentId))

    const rejected = await client
      .post('/settings')
      .loginAs(user)
      .withCsrfToken()
      .header('referer', '/settings')
      .field('fullName', 'Changed Name')
      .field('email', 'avatar@example.com')
      .file('avatar', Buffer.from('not an image'), {
        filename: 'bad.png',
        contentType: 'image/png',
      })

    rejected.assertRedirectsTo('/settings')
    await user.refresh()
    assert.equal(user.fullName, 'Avatar User')
    const retainedAvatar = await user.avatar.get()
    assert.equal(retainedAvatar?.attachmentId, secondAvatar!.attachmentId)

    const removed = await client.delete('/settings/avatar').loginAs(user).withCsrfToken()
    removed.assertRedirectsTo('/settings')
    assert.isNull(await user.avatar.get())
    assert.isNull(await AttachmentModel.find(secondAvatar!.attachmentId))
  })

  test('requires the current password before changing it', async ({ client, assert }) => {
    const user = await User.create({
      fullName: 'Password User',
      email: 'password@example.com',
      password: 'secret-password',
    })

    const rejected = await client
      .post('/settings/security')
      .loginAs(user)
      .withCsrfToken()
      .header('referer', '/settings/security')
      .form({
        currentPassword: 'wrong-password',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      })
    rejected.assertRedirectsTo('/settings/security')
    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'secret-password'))

    const updated = await client.post('/settings/security').loginAs(user).withCsrfToken().form({
      currentPassword: 'secret-password',
      password: 'new-password',
      passwordConfirmation: 'new-password',
    })
    updated.assertRedirectsTo('/settings/security')
    await user.refresh()
    assert.isTrue(await hash.verify(user.password, 'new-password'))
  })

  test('backfills a previous avatar path once', async ({ assert }) => {
    const root = app.tmpPath('legacy-avatar-fixture')
    const avatarPath = `avatars/${randomUUID()}.png`
    const source = join(root, avatarPath)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
      'base64'
    )
    await mkdir(dirname(source), { recursive: true })
    await writeFile(source, png)

    try {
      const user = await User.create({
        fullName: 'Legacy Avatar',
        email: 'legacy@example.com',
        password: 'secret-password',
        avatarPath,
      })

      await backfillUserAvatars(root)
      const avatar = await user.avatar.get()
      assert.isNotNull(avatar)
      const attachments = await app.container.make('jrmc.attachment')
      assert.deepEqual(Buffer.from(await attachments.read(avatar!.toAttachment())), png)

      await backfillUserAvatars(root)
      const retainedAvatar = await user.avatar.get()
      assert.equal(retainedAvatar?.attachmentId, avatar!.attachmentId)

      user.avatar.detach()
      await user.save()
    } finally {
      await rm(source, { force: true })
    }
  })
})
