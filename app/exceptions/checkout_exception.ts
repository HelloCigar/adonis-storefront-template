import { Exception } from '@adonisjs/core/exceptions'

export default class CheckoutException extends Exception {
  constructor(message: string, code: string, status = 409) {
    super(message, { code, status })
  }

  /**
   * Staff-only workflows recheck the actor even though routes already authorize them,
   * so a service reused from a job or command cannot act for a customer.
   */
  static assertStaff(actor: { isStoreStaff: boolean }, code: string) {
    if (!actor.isStoreStaff) throw new CheckoutException('Access denied', code, 403)
  }
}
