import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { signedUrlFor } from '@adonisjs/core/services/url_builder'
import User from '#models/account/user'

/**
 * The unsubscribe link in a cart reminder. Opening it only asks for confirmation, so email
 * scanners that prefetch links cannot unsubscribe anyone; the confirmed POST does the write.
 */
export default class CartReminderUnsubscribesController {
  async show({ request, params, inertia, response, session }: HttpContext) {
    if (!request.hasValidSignature()) {
      session.flash('error', 'This unsubscribe link has expired.')
      return response.redirect().withQs(false).toRoute('home')
    }
    const user = await User.findOrFail(params.id)
    return inertia.render('account/cart_reminders_unsubscribe', {
      action: signedUrlFor(
        'cart_reminders.unsubscribe.store',
        { id: user.id },
        { expiresIn: '1 hour' }
      ),
      alreadyUnsubscribed: !user.receivesCartReminders,
    })
  }

  async store({ request, params, response, session }: HttpContext) {
    if (!request.hasValidSignature()) {
      session.flash('error', 'This unsubscribe link has expired.')
      return response.redirect().withQs(false).toRoute('home')
    }
    const user = await User.findOrFail(params.id)
    if (user.receivesCartReminders) {
      user.cartRemindersOptedOutAt = DateTime.utc()
      await user.save()
    }
    session.flash('success', "You won't get cart reminders any more.")
    return response.redirect().withQs(false).toRoute('home')
  }
}
