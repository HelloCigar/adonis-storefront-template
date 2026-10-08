/*
|--------------------------------------------------------------------------
| HTTP limiters
|--------------------------------------------------------------------------
|
| Failed passwords for one email are throttled inside the session
| controller; these middleware cap request volume per client IP.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/** Sign-in requests across all emails, limiting credential stuffing from one client. */
export const loginThrottle = limiter.define('login', (ctx) =>
  limiter.allowRequests(20).every('15 minutes').usingKey(`login_ip_${ctx.request.ip()}`)
)

/** Account creation. */
export const signupThrottle = limiter.define('signup', (ctx) =>
  limiter.allowRequests(5).every('15 minutes').usingKey(`signup_${ctx.request.ip()}`)
)

/** Order submission; each order reserves stock until its payment expires. */
export const checkoutThrottle = limiter.define('checkout', (ctx) =>
  limiter.allowRequests(10).every('10 minutes').usingKey(`checkout_${ctx.request.ip()}`)
)

/** Discount code attempts, so codes cannot be guessed by enumeration. */
export const discountThrottle = limiter.define('discount', (ctx) =>
  limiter.allowRequests(20).every('10 minutes').usingKey(`discount_${ctx.request.ip()}`)
)
