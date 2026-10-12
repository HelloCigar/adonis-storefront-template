import type { Passkey } from '@adonisplus/persona/passkeys'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class PasskeyTransformer extends BaseTransformer<Passkey> {
  toObject() {
    return {
      id: String(this.resource.identifier),
      ...this.pick(this.resource, ['name', 'backedUp', 'createdAt', 'lastUsedAt']),
    }
  }
}
