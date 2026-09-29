import type { HttpContext } from '@adonisjs/core/http'
import { updatePasswordValidator, updateProfileValidator } from '#validators/user'
import hash from '@adonisjs/core/services/hash'
import { attachmentManager } from '@jrmc/adonis-attachment'

export default class SettingsController {
  index({ inertia }: HttpContext) {
    return inertia.render('settings/index', {})
  }

  async update({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { avatar, fullName, email } = await request.validateUsing(updateProfileValidator, {
      meta: { userId: user.id },
    })

    if (avatar) {
      user.avatar.set(await attachmentManager.createFromFile(avatar))
    }

    user.merge({ fullName, email })
    await user.save()

    session.flash('success', 'Your profile has been updated.')
    return response.redirect().toRoute('settings')
  }

  async destroyAvatar({ auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    user.avatar.detach()
    await user.save()

    session.flash('success', 'Your avatar has been removed.')
    return response.redirect().toRoute('settings')
  }

  members({ inertia }: HttpContext) {
    return inertia.render('settings/members', {})
  }

  notifications({ inertia }: HttpContext) {
    return inertia.render('settings/notifications', {})
  }

  security({ inertia }: HttpContext) {
    return inertia.render('settings/security', {})
  }

  async updatePassword({ request, auth, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { currentPassword, password } = await request.validateUsing(updatePasswordValidator)

    if (!(await hash.verify(user.password, currentPassword))) {
      session.flash('inputErrorsBag', {
        currentPassword: ['The current password is incorrect.'],
      })
      return response.redirect().back()
    }

    if (await hash.verify(user.password, password)) {
      session.flash('inputErrorsBag', {
        password: ['Choose a password different from your current password.'],
      })
      return response.redirect().back()
    }

    user.password = password
    await user.save()
    session.flash('success', 'Your password has been updated.')
    return response.redirect().toRoute('settings.security')
  }
}
