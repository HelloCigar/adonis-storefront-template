import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { updateCartReminderValidator } from '#validators/account/cart_reminder'

export default class CartRemindersController {
  async update({ request, auth, response, session }: HttpContext) {
    const { enabled } = await request.validateUsing(updateCartReminderValidator)
    const user = auth.getUserOrFail()
    user.cartRemindersOptedOutAt = enabled ? null : DateTime.utc()
    await user.save()
    session.flash('success', enabled ? 'Cart reminders turned on.' : 'Cart reminders turned off.')
    return response.redirect().back()
  }
}
