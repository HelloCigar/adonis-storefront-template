import { Exception } from '@adonisjs/core/exceptions'

export default class CheckoutException extends Exception {
  constructor(message: string, code: string, status = 409) {
    super(message, { code, status })
  }
}
