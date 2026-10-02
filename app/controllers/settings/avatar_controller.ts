import { inject } from '@adonisjs/core'
import ProfileService from '#services/settings/profile_service'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class AvatarController {
  constructor(private profileService: ProfileService) {}

  async destroy({ auth, response, session }: HttpContext) {
    await this.profileService.removeAvatar(auth.getUserOrFail())
    session.flash('success', 'Your avatar has been removed.')
    return response.redirect().toRoute('settings')
  }
}
