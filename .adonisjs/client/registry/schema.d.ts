/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'home': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/storefront_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/storefront_controller').default['index']>>>
    }
  }
  'attachments.show': {
    methods: ["GET","HEAD"]
    pattern: '/attachments/:id/:name?'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/media/attachments_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/media/attachments_controller').default['show']>>>
    }
  }
  'collections.index': {
    methods: ["GET","HEAD"]
    pattern: '/collections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/collections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/collections_controller').default['index']>>>
    }
  }
  'collections.show': {
    methods: ["GET","HEAD"]
    pattern: '/collection/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/catalog/collection').collectionQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/collections_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/collections_controller').default['show']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'products.show': {
    methods: ["GET","HEAD"]
    pattern: '/product/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/products_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/products_controller').default['show']>>>
    }
  }
  'pages.show': {
    methods: ["GET","HEAD"]
    pattern: '/pages/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/pages_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/pages_controller').default['show']>>>
    }
  }
  'policies.index': {
    methods: ["GET","HEAD"]
    pattern: '/policies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/policies_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/policies_controller').default['index']>>>
    }
  }
  'policies.show': {
    methods: ["GET","HEAD"]
    pattern: '/policies/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/policies_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/policies_controller').default['show']>>>
    }
  }
  'blog.index': {
    methods: ["GET","HEAD"]
    pattern: '/blog'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/blog_posts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/blog_posts_controller').default['index']>>>
    }
  }
  'blog.show': {
    methods: ["GET","HEAD"]
    pattern: '/blog/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/blog_posts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/blog_posts_controller').default['show']>>>
    }
  }
  'cart.recover': {
    methods: ["GET","HEAD"]
    pattern: '/store/cart/recover/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/cart_recoveries_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/cart_recoveries_controller').default['show']>>>
    }
  }
  'cart.add': {
    methods: ["POST"]
    pattern: '/store/cart'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/cart').cartAddValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/cart').cartAddValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'cart.update': {
    methods: ["PATCH"]
    pattern: '/store/cart/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/cart').cartUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/cart').cartUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'cart.remove': {
    methods: ["DELETE"]
    pattern: '/store/cart/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/cart_controller').default['destroy']>>>
    }
  }
  'cart_reminders.unsubscribe.show': {
    methods: ["GET","HEAD"]
    pattern: '/cart-reminders/unsubscribe/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/cart_reminder_unsubscribes_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/cart_reminder_unsubscribes_controller').default['show']>>>
    }
  }
  'cart_reminders.unsubscribe.store': {
    methods: ["POST"]
    pattern: '/cart-reminders/unsubscribe/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/cart_reminder_unsubscribes_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/cart_reminder_unsubscribes_controller').default['store']>>>
    }
  }
  'checkout.create': {
    methods: ["GET","HEAD"]
    pattern: '/checkout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/checkout_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/checkout_controller').default['create']>>>
    }
  }
  'checkout.store': {
    methods: ["POST"]
    pattern: '/checkout'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/checkout').checkoutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/checkout').checkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/checkout_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/checkout_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'checkout.discount.store': {
    methods: ["POST"]
    pattern: '/checkout/discount'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/cart').discountCodeValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/cart').discountCodeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/discounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/discounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'checkout.discount.destroy': {
    methods: ["DELETE"]
    pattern: '/checkout/discount'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/discounts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/discounts_controller').default['destroy']>>>
    }
  }
  'checkout.access.show': {
    methods: ["GET","HEAD"]
    pattern: '/checkout/orders/:publicId/access'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/order_access_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/order_access_controller').default['show']>>>
    }
  }
  'checkout.access.store': {
    methods: ["POST"]
    pattern: '/checkout/orders/:publicId/claim'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/order_access_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/order_access_controller').default['store']>>>
    }
  }
  'checkout.orders.show': {
    methods: ["GET","HEAD"]
    pattern: '/checkout/orders/:publicId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/orders_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/orders_controller').default['show']>>>
    }
  }
  'checkout.invoices.show': {
    methods: ["GET","HEAD"]
    pattern: '/checkout/orders/:publicId/invoice'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/invoices_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/invoices_controller').default['show']>>>
    }
  }
  'checkout.cancellations.store': {
    methods: ["POST"]
    pattern: '/checkout/orders/:publicId/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/cancellations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/cancellations_controller').default['store']>>>
    }
  }
  'checkout.reconciliations.store': {
    methods: ["POST"]
    pattern: '/checkout/orders/:publicId/reconcile'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { publicId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/checkout/reconciliations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/checkout/reconciliations_controller').default['store']>>>
    }
  }
  'payments.webhooks.store': {
    methods: ["POST"]
    pattern: '/payments/webhooks/:provider'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { provider: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/payments/webhooks_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/payments/webhooks_controller').default['store']>>>
    }
  }
  'payments.simulations.show': {
    methods: ["GET","HEAD"]
    pattern: '/_dev/paymongo/checkouts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#providers/payments/fake_paymongo_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#providers/payments/fake_paymongo_controller').default['show']>>>
    }
  }
  'payments.simulations.store': {
    methods: ["POST"]
    pattern: '/_dev/paymongo/checkouts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/payments/simulation').simulationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/payments/simulation').simulationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#providers/payments/fake_paymongo_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#providers/payments/fake_paymongo_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'assistant.conversations.index': {
    methods: ["GET","HEAD"]
    pattern: '/assistant/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['index']>>>
    }
  }
  'assistant.conversations.store': {
    methods: ["POST"]
    pattern: '/assistant/conversations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['store']>>>
    }
  }
  'assistant.conversations.show': {
    methods: ["GET","HEAD"]
    pattern: '/assistant/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['show']>>>
    }
  }
  'assistant.conversations.destroy': {
    methods: ["DELETE"]
    pattern: '/assistant/conversations/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_conversations_controller').default['destroy']>>>
    }
  }
  'assistant.conversations.messages.store': {
    methods: ["POST"]
    pattern: '/assistant/conversations/:conversationId/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/assistant/assistant_message').storeAssistantMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { conversationId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/assistant/assistant_message').storeAssistantMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_messages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_messages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'assistant.proposals.update': {
    methods: ["PUT","PATCH"]
    pattern: '/assistant/proposals/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/assistant/assistant_proposal').updateAssistantProposalValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/assistant/assistant_proposal').updateAssistantProposalValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_proposals_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/assistant/assistant_proposals_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'email_verifications.show': {
    methods: ["GET","HEAD"]
    pattern: '/email-verifications/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['show']>>>
    }
  }
  'email_verifications.update': {
    methods: ["PUT"]
    pattern: '/email-verifications/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['update']>>>
    }
  }
  'password_resets.show': {
    methods: ["GET","HEAD"]
    pattern: '/password-resets/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['show']>>>
    }
  }
  'password_resets.update': {
    methods: ["PUT"]
    pattern: '/password-resets/:token'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').resetPasswordValidator)>>
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').resetPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'passkey_login_challenges.store': {
    methods: ["POST"]
    pattern: '/login/passkey/challenge'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/passkey_login_challenges_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/passkey_login_challenges_controller').default['store']>>>
    }
  }
  'passkey_session.store': {
    methods: ["POST"]
    pattern: '/login/passkey'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').passkeyAuthenticationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').passkeyAuthenticationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/passkey_session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/passkey_session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'password_resets.create': {
    methods: ["GET","HEAD"]
    pattern: '/forgot-password'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['create']>>>
    }
  }
  'password_resets.store': {
    methods: ["POST"]
    pattern: '/password-resets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').forgotPasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').forgotPasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/password_resets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.show': {
    methods: ["GET","HEAD"]
    pattern: '/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/account_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/account_controller').default['show']>>>
    }
  }
  'email_verifications.store': {
    methods: ["POST"]
    pattern: '/email-verifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['store']>>>
    }
  }
  'email_verifications.create': {
    methods: ["GET","HEAD"]
    pattern: '/account/activate'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/email_verifications_controller').default['create']>>>
    }
  }
  'account.logout': {
    methods: ["GET","HEAD"]
    pattern: '/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/logout_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/logout_controller').default['show']>>>
    }
  }
  'account.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/profile_controller').default['show']>>>
    }
  }
  'account.security.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/security'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/security_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/security_controller').default['show']>>>
    }
  }
  'account.addresses.index': {
    methods: ["GET","HEAD"]
    pattern: '/account/addresses'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['index']>>>
    }
  }
  'account.addresses.create': {
    methods: ["POST"]
    pattern: '/account/addresses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account/address').addressValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account/address').addressValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.addresses.update': {
    methods: ["PATCH"]
    pattern: '/account/addresses/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account/address').addressValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/account/address').addressValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.addresses.default': {
    methods: ["POST"]
    pattern: '/account/addresses/:id/default'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/default_address_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/default_address_controller').default['update']>>>
    }
  }
  'account.addresses.delete': {
    methods: ["DELETE"]
    pattern: '/account/addresses/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['destroy']>>>
    }
  }
  'account.cart_reminders.update': {
    methods: ["PUT"]
    pattern: '/account/cart-reminders'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/account/cart_reminder').updateCartReminderValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/account/cart_reminder').updateCartReminderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/cart_reminders_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/cart_reminders_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.store': {
    methods: ["POST"]
    pattern: '/products/:productId/reviews'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalog/review').reviewValidator)>>
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalog/review').reviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.update': {
    methods: ["PATCH"]
    pattern: '/reviews/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/catalog/review').reviewValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/catalog/review').reviewValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'reviews.destroy': {
    methods: ["DELETE"]
    pattern: '/reviews/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront/reviews_controller').default['destroy']>>>
    }
  }
  'orders.index': {
    methods: ["GET","HEAD"]
    pattern: '/account/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/orders_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/orders_controller').default['index']>>>
    }
  }
  'orders.show': {
    methods: ["GET","HEAD"]
    pattern: '/account/orders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/orders_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/orders_controller').default['show']>>>
    }
  }
  'chat.messages.store': {
    methods: ["POST"]
    pattern: '/chat/orders/:orderId/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/chat/message').imageMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { orderId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/chat/message').imageMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat/messages_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat/messages_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'chat.images.show': {
    methods: ["GET","HEAD"]
    pattern: '/chat/orders/:orderId/images/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { orderId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/chat/images_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/chat/images_controller').default['show']>>>
    }
  }
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/dashboard/summary').dashboardQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard/dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard/dashboard_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'launch_checklist.destroy': {
    methods: ["DELETE"]
    pattern: '/dashboard/launch-checklist'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard/launch_checklist_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard/launch_checklist_controller').default['destroy']>>>
    }
  }
  'inbox': {
    methods: ["GET","HEAD"]
    pattern: '/inbox'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/chat/inbox').inboxQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard/inbox_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard/inbox_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'customers': {
    methods: ["GET","HEAD"]
    pattern: '/customers'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/customers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/customers_controller').default['index']>>>
    }
  }
  'setup.index': {
    methods: ["GET","HEAD"]
    pattern: '/setup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['index']>>>
    }
  }
  'setup.show': {
    methods: ["GET","HEAD"]
    pattern: '/setup/:step'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { step: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['show']>>>
    }
  }
  'setup.update': {
    methods: ["PUT"]
    pattern: '/setup/:step'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/store_setting').storeIdentityValidator)>|InferInput<(typeof import('#validators/settings/store_setting').storeShippingValidator)>|InferInput<(typeof import('#validators/settings/store_policy').storePoliciesValidator)>>
      paramsTuple: [ParamValue]
      params: { step: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/store_setting').storeIdentityValidator)>|InferInput<(typeof import('#validators/settings/store_setting').storeShippingValidator)>|InferInput<(typeof import('#validators/settings/store_policy').storePoliciesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/setup/setup_steps_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.store_policies.edit': {
    methods: ["GET","HEAD"]
    pattern: '/settings/store/policies'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/store_policies_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/store_policies_controller').default['edit']>>>
    }
  }
  'settings.store_policies.update': {
    methods: ["PUT"]
    pattern: '/settings/store/policies'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/store_policy').storePoliciesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/store_policy').storePoliciesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/store_policies_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/store_policies_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.shopping_assistant.update': {
    methods: ["PUT"]
    pattern: '/settings/store/assistant'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/shopping_assistant_setting').updateShoppingAssistantSettingValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/shopping_assistant_setting').updateShoppingAssistantSettingValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/shopping_assistant_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/shopping_assistant_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.store.edit': {
    methods: ["GET","HEAD"]
    pattern: '/settings/store'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/store_settings_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/store_settings_controller').default['edit']>>>
    }
  }
  'settings.store.update': {
    methods: ["PUT"]
    pattern: '/settings/store'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/store_setting').storeSettingsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/store_setting').storeSettingsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/store_settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/store_settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings': {
    methods: ["GET","HEAD"]
    pattern: '/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/settings_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/settings_controller').default['index']>>>
    }
  }
  'settings.update': {
    methods: ["POST"]
    pattern: '/settings'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/user').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/user').updateProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/settings_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/settings_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.avatar.destroy': {
    methods: ["DELETE"]
    pattern: '/settings/avatar'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/avatar_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/avatar_controller').default['destroy']>>>
    }
  }
  'settings.members': {
    methods: ["GET","HEAD"]
    pattern: '/settings/members'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/members_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/members_controller').default['index']>>>
    }
  }
  'settings.security': {
    methods: ["GET","HEAD"]
    pattern: '/settings/security'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['show']>>>
    }
  }
  'settings.password.update': {
    methods: ["POST"]
    pattern: '/settings/security'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/settings/user').updatePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/settings/user').updatePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'passkey_registration_challenges.store': {
    methods: ["POST"]
    pattern: '/settings/passkeys/challenge'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/passkey_registration_challenges_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/passkey_registration_challenges_controller').default['store']>>>
    }
  }
  'passkeys.store': {
    methods: ["POST"]
    pattern: '/settings/passkeys'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').passkeyRegistrationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').passkeyRegistrationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'passkeys.update': {
    methods: ["PUT"]
    pattern: '/settings/passkeys/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/auth/user').passkeyNameValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/auth/user').passkeyNameValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'passkeys.destroy': {
    methods: ["DELETE"]
    pattern: '/settings/passkeys/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/passkeys_controller').default['destroy']>>>
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['destroy']>>>
    }
  }
  'seller.products.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/products'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['index']>>>
    }
  }
  'seller.products.store': {
    methods: ["POST"]
    pattern: '/seller/products'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/product').productCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/product').productCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.products.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/products/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['show']>>>
    }
  }
  'seller.products.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/products/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/product').productUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/product').productUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.products.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/products/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/products_controller').default['destroy']>>>
    }
  }
  'seller.variants.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/products/:productId/variants'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['index']>>>
    }
  }
  'seller.variants.store': {
    methods: ["POST"]
    pattern: '/seller/products/:productId/variants'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/variant').variantCreateValidator)>>
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/variant').variantCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.variants.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/products/:productId/variants/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/variant').variantUpdateValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { productId: ParamValue; id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/variant').variantUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.variants.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/products/:productId/variants/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { productId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/variants_controller').default['destroy']>>>
    }
  }
  'seller.options.update': {
    methods: ["PATCH"]
    pattern: '/seller/products/:productId/options'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/options').optionsUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/options').optionsUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/options_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/options_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.variant_generation.store': {
    methods: ["POST"]
    pattern: '/seller/products/:productId/variants/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/variant_generation').variantGenerationValidator)>>
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/variant_generation').variantGenerationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/variant_generation_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/variant_generation_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.stock_adjustments.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/products/:productId/variants/:variantId/stock'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { productId: ParamValue; variantId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/stock_adjustments_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/stock_adjustments_controller').default['index']>>>
    }
  }
  'seller.stock_adjustments.store': {
    methods: ["POST"]
    pattern: '/seller/products/:productId/variants/:variantId/stock'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/stock_adjustment').stockAdjustmentValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { productId: ParamValue; variantId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/stock_adjustment').stockAdjustmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/stock_adjustments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/stock_adjustments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.images.store': {
    methods: ["POST"]
    pattern: '/seller/products/:productId/images'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/images').productImagesValidator)>>
      paramsTuple: [ParamValue]
      params: { productId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/images').productImagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/images_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/images_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.images.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/products/:productId/images/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { productId: ParamValue; id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/images_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/images_controller').default['destroy']>>>
    }
  }
  'seller.collections.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/collections'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['index']>>>
    }
  }
  'seller.collections.store': {
    methods: ["POST"]
    pattern: '/seller/collections'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/collection').collectionCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/collection').collectionCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.collections.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/collections/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/collection').collectionUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/collection').collectionUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.collections.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/collections/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/collections_controller').default['destroy']>>>
    }
  }
  'seller.discounts.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/discounts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['index']>>>
    }
  }
  'seller.discounts.store': {
    methods: ["POST"]
    pattern: '/seller/discounts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/discount').discountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/discount').discountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.discounts.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/discounts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/discount').discountValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/discount').discountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.discounts.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/discounts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/discounts_controller').default['destroy']>>>
    }
  }
  'seller.reviews.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/reviews'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/seller/review').reviewIndexQueryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/reviews_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/reviews_controller').default['index']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.reviews.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/reviews/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/review').reviewModerationValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/review').reviewModerationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/reviews_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/reviews_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.posts.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/posts'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['index']>>>
    }
  }
  'seller.posts.create': {
    methods: ["GET","HEAD"]
    pattern: '/seller/posts/create'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['create']>>>
    }
  }
  'seller.posts.store': {
    methods: ["POST"]
    pattern: '/seller/posts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/post').postValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/post').postValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.posts.edit': {
    methods: ["GET","HEAD"]
    pattern: '/seller/posts/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['edit']>>>
    }
  }
  'seller.posts.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/posts/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/post').postValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/post').postValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.posts.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/posts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/posts_controller').default['destroy']>>>
    }
  }
  'seller.orders.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/orders'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['index']>>>
    }
  }
  'seller.orders.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/orders/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['show']>>>
    }
  }
  'seller.orders.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/orders/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/order').orderUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/order').orderUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/orders_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.packing.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/packing'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/packing_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/packing_controller').default['store']>>>
    }
  }
  'seller.shipments.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/shipment'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/fulfillment').shipmentValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/fulfillment').shipmentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/shipments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/shipments_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.deliveries.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/delivery'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/deliveries_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/deliveries_controller').default['store']>>>
    }
  }
  'seller.refunds.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/refund'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/fulfillment').refundValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/fulfillment').refundValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/refunds_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/refunds_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.cancellations.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/cancellations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/cancellations_controller').default['store']>>>
    }
  }
  'seller.operations.store': {
    methods: ["POST"]
    pattern: '/seller/orders/:id/operations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/checkout/fulfillment').operationRetryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/checkout/fulfillment').operationRetryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/operations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/operations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.users.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['index']>>>
    }
  }
  'seller.users.store': {
    methods: ["POST"]
    pattern: '/seller/users'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/user').userCreateValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/user').userCreateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.users.update': {
    methods: ["PUT","PATCH"]
    pattern: '/seller/users/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/seller/user').userUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/seller/user').userUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'seller.users.destroy': {
    methods: ["DELETE"]
    pattern: '/seller/users/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/users_controller').default['destroy']>>>
    }
  }
  'seller.emails.index': {
    methods: ["GET","HEAD"]
    pattern: '/seller/emails'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/emails_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/emails_controller').default['index']>>>
    }
  }
  'seller.emails.show': {
    methods: ["GET","HEAD"]
    pattern: '/seller/emails/:email'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { email: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/seller/emails_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/seller/emails_controller').default['show']>>>
    }
  }
}
