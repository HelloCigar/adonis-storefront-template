import { Exception } from '@adonisjs/core/exceptions'

/**
 * The shopping assistant is switched off or the deployment has no AI key. No `handle()`: these
 * routes are only called by the assistant's `fetch` client (Accept: application/json), so the
 * handler's JSON fall-through returns `{ message }` instead of a flash and redirect.
 */
export default class AssistantUnavailableException extends Exception {
  static status = 503
  static code = 'E_ASSISTANT_UNAVAILABLE'
}
