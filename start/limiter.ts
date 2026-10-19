/*
|--------------------------------------------------------------------------
| HTTP limiters
|--------------------------------------------------------------------------
|
| Failed passwords for one email are throttled inside the session
| controller; these middleware cap request volume per client IP.
|
*/

import type { HttpContext } from '@adonisjs/core/http'
import limiter from '@adonisjs/limiter/services/main'

/** Sign-in requests across all emails, limiting credential stuffing from one client. */
export const loginThrottle = limiter.define('login', (ctx) =>
  limiter.allowRequests(20).every('15 minutes').usingKey(`login_ip_${ctx.request.ip()}`)
)

/** Account creation. */
export const signupThrottle = limiter.define('signup', (ctx) =>
  limiter.allowRequests(5).every('15 minutes').usingKey(`signup_${ctx.request.ip()}`)
)

/** Password reset requests; each sends at most one email per address per minute on its own. */
export const passwordResetThrottle = limiter.define('password_reset', (ctx) =>
  limiter.allowRequests(5).every('15 minutes').usingKey(`password_reset_${ctx.request.ip()}`)
)

/** Order submission; each order reserves stock until its payment expires. */
export const checkoutThrottle = limiter.define('checkout', (ctx) =>
  limiter.allowRequests(10).every('10 minutes').usingKey(`checkout_${ctx.request.ip()}`)
)

/** Discount code attempts, so codes cannot be guessed by enumeration. */
export const discountThrottle = limiter.define('discount', (ctx) =>
  limiter.allowRequests(20).every('10 minutes').usingKey(`discount_${ctx.request.ip()}`)
)
/** Chat photo uploads per account; text messages are limited inside the chat socket. */
export const chatImageThrottle = limiter.define('chat_images', (ctx) =>
  limiter
    .allowRequests(10)
    .every('1 minute')
    .usingKey(`chat_images_${ctx.auth.user?.id ?? ctx.request.ip()}`)
)

/** Per signed-in shopper, or per browser (a random visitor token in the session) when signed out. */
function assistantKey(prefix: string, ctx: HttpContext) {
  return ctx.auth.user
    ? `${prefix}_user_${ctx.auth.user.id}`
    : `${prefix}_visitor_${ctx.assistantSession.visitorToken()}`
}

/** Shopping assistant messages: 30 an hour per signed-in shopper, or per browser when signed out. */
export const assistantMessageThrottle = limiter.define('assistant_messages', (ctx) =>
  limiter.allowRequests(30).every('1 hour').usingKey(assistantKey('assistant_messages', ctx))
)

/** New assistant conversations, so empty ones can't be created without limit. */
export const assistantConversationThrottle = limiter.define('assistant_conversations', (ctx) =>
  limiter.allowRequests(20).every('1 hour').usingKey(assistantKey('assistant_conversations', ctx))
)

/** Copilot messages: 60 an hour per staff member. */
export const copilotMessageThrottle = limiter.define('copilot_messages', (ctx) =>
  limiter.allowRequests(60).every('1 hour').usingKey(`copilot_messages_user_${ctx.auth.user!.id}`)
)

/** New copilot conversations, so empty ones can't be created without limit. */
export const copilotConversationThrottle = limiter.define('copilot_conversations', (ctx) =>
  limiter
    .allowRequests(20)
    .every('1 hour')
    .usingKey(`copilot_conversations_user_${ctx.auth.user!.id}`)
)
