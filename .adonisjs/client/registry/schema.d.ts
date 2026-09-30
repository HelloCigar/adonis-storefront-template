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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/storefront_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/collections_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/collections_controller').default['index']>>>
    }
  }
  'collections.show': {
    methods: ["GET","HEAD"]
    pattern: '/collection/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/collections_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/collections_controller').default['show']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/products_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/products_controller').default['show']>>>
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
  'blogs.show': {
    methods: ["GET","HEAD"]
    pattern: '/blog/:handle'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { handle: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/blogs_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/blogs_controller').default['show']>>>
    }
  }
  'articles.show': {
    methods: ["GET","HEAD"]
    pattern: '/blog/:handle/:article'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { handle: ParamValue; article: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/content/articles_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/content/articles_controller').default['show']>>>
    }
  }
  'cart.add': {
    methods: ["POST"]
    pattern: '/store/cart'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').cartAddValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').cartAddValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'cart.update': {
    methods: ["PATCH"]
    pattern: '/store/cart/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').cartUpdateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').cartUpdateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/cart_controller').default['destroy']>>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/auth/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
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
  'account.profile.update': {
    methods: ["PATCH"]
    pattern: '/account/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').storefrontProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').storefrontProfileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/profile_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/profile_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.addresses.create': {
    methods: ["POST"]
    pattern: '/account/addresses'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').addressValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').addressValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account/addresses_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'account.addresses.update': {
    methods: ["PATCH"]
    pattern: '/account/addresses/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/storefront').addressValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/storefront').addressValidator)>>
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
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/dashboard'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
    }
  }
  'inbox': {
    methods: ["GET","HEAD"]
    pattern: '/inbox'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/inbox_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/inbox_controller').default['index']>>>
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
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/customers_controller').default['index']>>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updateProfileValidator)>>
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
  'settings.notifications': {
    methods: ["GET","HEAD"]
    pattern: '/settings/notifications'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/notifications_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/notifications_controller').default['index']>>>
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
      body: ExtractBody<InferInput<(typeof import('#validators/user').updatePasswordValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').updatePasswordValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings/security_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
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
}
