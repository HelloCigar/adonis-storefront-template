import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { signup } from '#tests/helpers/accounts'

test.group('Account emails', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('emails are stored lowercase and match regardless of case', async ({
    client,
    assert,
    route,
  }) => {
    // @ts-ignore -- the fake keeps the signup mail away from a real mailbox
    using mails = mail.fake()

    const created = await client
      .post(urlFor('new_account.store'))
      .withCsrfToken()
      .redirects(0)
      .json(signup('  Mixed.Case@Example.COM '))
    created.assertStatus(302)
    const user = await User.findByOrFail('email', 'mixed.case@example.com')

    const duplicate = await client
      .post(urlFor('new_account.store'))
      .withCsrfToken()
      .accept('json')
      .json(signup('MIXED.case@example.com'))
    duplicate.assertStatus(422)
    assert.lengthOf(await User.query().whereILike('email', 'mixed.case@example.com'), 1)

    const login = await client
      .post(urlFor('session.store'))
      .withCsrfToken()
      .redirects(0)
      .json({ email: 'MIXED.CASE@example.com', password: 'secret-password' })
    login.assertStatus(302)
    login.assertHeader('location', route('account.show'))

    await user.merge({ email: 'Renamed@Example.com' }).save()
    const renamed = await User.findOrFail(user.id)
    assert.equal(renamed.email, 'renamed@example.com')
  })
})
