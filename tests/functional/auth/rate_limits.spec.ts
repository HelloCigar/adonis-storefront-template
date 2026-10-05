import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'

const signup = (email: string) => ({
  fullName: 'Customer',
  email,
  password: 'secret-password',
  passwordConfirmation: 'secret-password',
})

test.group('Rate limits', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('repeated failed sign-ins lock that email even with the right password', async ({
    client,
    assert,
  }) => {
    await User.create({ email: 'locked@example.com', password: 'secret-password' })
    for (let attempt = 0; attempt < 5; attempt++) {
      const failed = await client
        .post('/login')
        .withCsrfToken()
        .accept('json')
        .json({ email: 'locked@example.com', password: 'wrong-password' })
      failed.assertStatus(400)
    }
    const locked = await client
      .post('/login')
      .withCsrfToken()
      .accept('json')
      .json({ email: 'Locked@example.com', password: 'secret-password' })
    locked.assertStatus(422)
    assert.match(locked.body().errors[0].message, /Too many failed sign-in attempts/)

    const otherEmail = await User.create({
      email: 'other@example.com',
      password: 'secret-password',
    })
    const unaffected = await client
      .post('/login')
      .withCsrfToken()
      .redirects(0)
      .json({ email: otherEmail.email, password: 'secret-password' })
    unaffected.assertStatus(302)
  })

  test('signup volume per client is capped and Inertia forms get a flash message', async ({
    client,
    assert,
  }) => {
    for (let index = 0; index < 5; index++) {
      const created = await client
        .post('/signup')
        .withCsrfToken()
        .redirects(0)
        .json(signup(`customer-${index}@example.com`))
      created.assertStatus(302)
    }
    const blocked = await client
      .post('/signup')
      .withCsrfToken()
      .accept('json')
      .json(signup('blocked@example.com'))
    blocked.assertStatus(429)
    assert.isNull(await User.findBy('email', 'blocked@example.com'))

    const inertia = await client
      .post('/signup')
      .withCsrfToken()
      .header('X-Inertia', 'true')
      .header('Referer', '/signup')
      .redirects(0)
      .json(signup('blocked@example.com'))
    assert.include([302, 303], inertia.status())
    assert.match(String(inertia.flashMessages().error), /Too many attempts/)
  })
})
