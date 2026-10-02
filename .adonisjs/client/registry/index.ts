/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'home': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [{"old":"/","type":0,"val":"/","end":""}],
    types: placeholder as Registry['home']['types'],
  },
  'collections.index': {
    methods: ["GET","HEAD"],
    pattern: '/collections',
    tokens: [{"old":"/collections","type":0,"val":"collections","end":""}],
    types: placeholder as Registry['collections.index']['types'],
  },
  'collections.show': {
    methods: ["GET","HEAD"],
    pattern: '/collection/:handle',
    tokens: [{"old":"/collection/:handle","type":0,"val":"collection","end":""},{"old":"/collection/:handle","type":1,"val":"handle","end":""}],
    types: placeholder as Registry['collections.show']['types'],
  },
  'products.show': {
    methods: ["GET","HEAD"],
    pattern: '/product/:handle',
    tokens: [{"old":"/product/:handle","type":0,"val":"product","end":""},{"old":"/product/:handle","type":1,"val":"handle","end":""}],
    types: placeholder as Registry['products.show']['types'],
  },
  'pages.show': {
    methods: ["GET","HEAD"],
    pattern: '/pages/:handle',
    tokens: [{"old":"/pages/:handle","type":0,"val":"pages","end":""},{"old":"/pages/:handle","type":1,"val":"handle","end":""}],
    types: placeholder as Registry['pages.show']['types'],
  },
  'policies.index': {
    methods: ["GET","HEAD"],
    pattern: '/policies',
    tokens: [{"old":"/policies","type":0,"val":"policies","end":""}],
    types: placeholder as Registry['policies.index']['types'],
  },
  'policies.show': {
    methods: ["GET","HEAD"],
    pattern: '/policies/:handle',
    tokens: [{"old":"/policies/:handle","type":0,"val":"policies","end":""},{"old":"/policies/:handle","type":1,"val":"handle","end":""}],
    types: placeholder as Registry['policies.show']['types'],
  },
  'blogs.show': {
    methods: ["GET","HEAD"],
    pattern: '/blog/:handle',
    tokens: [{"old":"/blog/:handle","type":0,"val":"blog","end":""},{"old":"/blog/:handle","type":1,"val":"handle","end":""}],
    types: placeholder as Registry['blogs.show']['types'],
  },
  'articles.show': {
    methods: ["GET","HEAD"],
    pattern: '/blog/:handle/:article',
    tokens: [{"old":"/blog/:handle/:article","type":0,"val":"blog","end":""},{"old":"/blog/:handle/:article","type":1,"val":"handle","end":""},{"old":"/blog/:handle/:article","type":1,"val":"article","end":""}],
    types: placeholder as Registry['articles.show']['types'],
  },
  'cart.add': {
    methods: ["POST"],
    pattern: '/store/cart',
    tokens: [{"old":"/store/cart","type":0,"val":"store","end":""},{"old":"/store/cart","type":0,"val":"cart","end":""}],
    types: placeholder as Registry['cart.add']['types'],
  },
  'cart.update': {
    methods: ["PATCH"],
    pattern: '/store/cart/:id',
    tokens: [{"old":"/store/cart/:id","type":0,"val":"store","end":""},{"old":"/store/cart/:id","type":0,"val":"cart","end":""},{"old":"/store/cart/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['cart.update']['types'],
  },
  'cart.remove': {
    methods: ["DELETE"],
    pattern: '/store/cart/:id',
    tokens: [{"old":"/store/cart/:id","type":0,"val":"store","end":""},{"old":"/store/cart/:id","type":0,"val":"cart","end":""},{"old":"/store/cart/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['cart.remove']['types'],
  },
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [{"old":"/signup","type":0,"val":"signup","end":""}],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [{"old":"/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['session.store']['types'],
  },
  'account.show': {
    methods: ["GET","HEAD"],
    pattern: '/account',
    tokens: [{"old":"/account","type":0,"val":"account","end":""}],
    types: placeholder as Registry['account.show']['types'],
  },
  'account.logout': {
    methods: ["GET","HEAD"],
    pattern: '/account/logout',
    tokens: [{"old":"/account/logout","type":0,"val":"account","end":""},{"old":"/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['account.logout']['types'],
  },
  'account.profile.update': {
    methods: ["PATCH"],
    pattern: '/account/profile',
    tokens: [{"old":"/account/profile","type":0,"val":"account","end":""},{"old":"/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['account.profile.update']['types'],
  },
  'account.addresses.create': {
    methods: ["POST"],
    pattern: '/account/addresses',
    tokens: [{"old":"/account/addresses","type":0,"val":"account","end":""},{"old":"/account/addresses","type":0,"val":"addresses","end":""}],
    types: placeholder as Registry['account.addresses.create']['types'],
  },
  'account.addresses.update': {
    methods: ["PATCH"],
    pattern: '/account/addresses/:id',
    tokens: [{"old":"/account/addresses/:id","type":0,"val":"account","end":""},{"old":"/account/addresses/:id","type":0,"val":"addresses","end":""},{"old":"/account/addresses/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['account.addresses.update']['types'],
  },
  'account.addresses.default': {
    methods: ["POST"],
    pattern: '/account/addresses/:id/default',
    tokens: [{"old":"/account/addresses/:id/default","type":0,"val":"account","end":""},{"old":"/account/addresses/:id/default","type":0,"val":"addresses","end":""},{"old":"/account/addresses/:id/default","type":1,"val":"id","end":""},{"old":"/account/addresses/:id/default","type":0,"val":"default","end":""}],
    types: placeholder as Registry['account.addresses.default']['types'],
  },
  'account.addresses.delete': {
    methods: ["DELETE"],
    pattern: '/account/addresses/:id',
    tokens: [{"old":"/account/addresses/:id","type":0,"val":"account","end":""},{"old":"/account/addresses/:id","type":0,"val":"addresses","end":""},{"old":"/account/addresses/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['account.addresses.delete']['types'],
  },
  'orders.index': {
    methods: ["GET","HEAD"],
    pattern: '/account/orders',
    tokens: [{"old":"/account/orders","type":0,"val":"account","end":""},{"old":"/account/orders","type":0,"val":"orders","end":""}],
    types: placeholder as Registry['orders.index']['types'],
  },
  'orders.show': {
    methods: ["GET","HEAD"],
    pattern: '/account/orders/:id',
    tokens: [{"old":"/account/orders/:id","type":0,"val":"account","end":""},{"old":"/account/orders/:id","type":0,"val":"orders","end":""},{"old":"/account/orders/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['orders.show']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/dashboard',
    tokens: [{"old":"/dashboard","type":0,"val":"dashboard","end":""}],
    types: placeholder as Registry['dashboard']['types'],
  },
  'inbox': {
    methods: ["GET","HEAD"],
    pattern: '/inbox',
    tokens: [{"old":"/inbox","type":0,"val":"inbox","end":""}],
    types: placeholder as Registry['inbox']['types'],
  },
  'customers': {
    methods: ["GET","HEAD"],
    pattern: '/customers',
    tokens: [{"old":"/customers","type":0,"val":"customers","end":""}],
    types: placeholder as Registry['customers']['types'],
  },
  'settings': {
    methods: ["GET","HEAD"],
    pattern: '/settings',
    tokens: [{"old":"/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['settings']['types'],
  },
  'settings.update': {
    methods: ["POST"],
    pattern: '/settings',
    tokens: [{"old":"/settings","type":0,"val":"settings","end":""}],
    types: placeholder as Registry['settings.update']['types'],
  },
  'settings.avatar.destroy': {
    methods: ["DELETE"],
    pattern: '/settings/avatar',
    tokens: [{"old":"/settings/avatar","type":0,"val":"settings","end":""},{"old":"/settings/avatar","type":0,"val":"avatar","end":""}],
    types: placeholder as Registry['settings.avatar.destroy']['types'],
  },
  'settings.members': {
    methods: ["GET","HEAD"],
    pattern: '/settings/members',
    tokens: [{"old":"/settings/members","type":0,"val":"settings","end":""},{"old":"/settings/members","type":0,"val":"members","end":""}],
    types: placeholder as Registry['settings.members']['types'],
  },
  'settings.notifications': {
    methods: ["GET","HEAD"],
    pattern: '/settings/notifications',
    tokens: [{"old":"/settings/notifications","type":0,"val":"settings","end":""},{"old":"/settings/notifications","type":0,"val":"notifications","end":""}],
    types: placeholder as Registry['settings.notifications']['types'],
  },
  'settings.security': {
    methods: ["GET","HEAD"],
    pattern: '/settings/security',
    tokens: [{"old":"/settings/security","type":0,"val":"settings","end":""},{"old":"/settings/security","type":0,"val":"security","end":""}],
    types: placeholder as Registry['settings.security']['types'],
  },
  'settings.password.update': {
    methods: ["POST"],
    pattern: '/settings/security',
    tokens: [{"old":"/settings/security","type":0,"val":"settings","end":""},{"old":"/settings/security","type":0,"val":"security","end":""}],
    types: placeholder as Registry['settings.password.update']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [{"old":"/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'seller.products.index': {
    methods: ["GET","HEAD"],
    pattern: '/seller/products',
    tokens: [{"old":"/seller/products","type":0,"val":"seller","end":""},{"old":"/seller/products","type":0,"val":"products","end":""}],
    types: placeholder as Registry['seller.products.index']['types'],
  },
  'seller.products.store': {
    methods: ["POST"],
    pattern: '/seller/products',
    tokens: [{"old":"/seller/products","type":0,"val":"seller","end":""},{"old":"/seller/products","type":0,"val":"products","end":""}],
    types: placeholder as Registry['seller.products.store']['types'],
  },
  'seller.products.update': {
    methods: ["PATCH"],
    pattern: '/seller/products/:id',
    tokens: [{"old":"/seller/products/:id","type":0,"val":"seller","end":""},{"old":"/seller/products/:id","type":0,"val":"products","end":""},{"old":"/seller/products/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.products.update']['types'],
  },
  'seller.products.destroy': {
    methods: ["DELETE"],
    pattern: '/seller/products/:id',
    tokens: [{"old":"/seller/products/:id","type":0,"val":"seller","end":""},{"old":"/seller/products/:id","type":0,"val":"products","end":""},{"old":"/seller/products/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.products.destroy']['types'],
  },
  'seller.variants.index': {
    methods: ["GET","HEAD"],
    pattern: '/seller/products/:productId/variants',
    tokens: [{"old":"/seller/products/:productId/variants","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/variants","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/variants","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/variants","type":0,"val":"variants","end":""}],
    types: placeholder as Registry['seller.variants.index']['types'],
  },
  'seller.variants.store': {
    methods: ["POST"],
    pattern: '/seller/products/:productId/variants',
    tokens: [{"old":"/seller/products/:productId/variants","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/variants","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/variants","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/variants","type":0,"val":"variants","end":""}],
    types: placeholder as Registry['seller.variants.store']['types'],
  },
  'seller.variants.update': {
    methods: ["PATCH"],
    pattern: '/seller/products/:productId/variants/:id',
    tokens: [{"old":"/seller/products/:productId/variants/:id","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/variants/:id","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/variants/:id","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/variants/:id","type":0,"val":"variants","end":""},{"old":"/seller/products/:productId/variants/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.variants.update']['types'],
  },
  'seller.variants.destroy': {
    methods: ["DELETE"],
    pattern: '/seller/products/:productId/variants/:id',
    tokens: [{"old":"/seller/products/:productId/variants/:id","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/variants/:id","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/variants/:id","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/variants/:id","type":0,"val":"variants","end":""},{"old":"/seller/products/:productId/variants/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.variants.destroy']['types'],
  },
  'seller.images.store': {
    methods: ["POST"],
    pattern: '/seller/products/:productId/images',
    tokens: [{"old":"/seller/products/:productId/images","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/images","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/images","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/images","type":0,"val":"images","end":""}],
    types: placeholder as Registry['seller.images.store']['types'],
  },
  'seller.images.destroy': {
    methods: ["DELETE"],
    pattern: '/seller/products/:productId/images/:id',
    tokens: [{"old":"/seller/products/:productId/images/:id","type":0,"val":"seller","end":""},{"old":"/seller/products/:productId/images/:id","type":0,"val":"products","end":""},{"old":"/seller/products/:productId/images/:id","type":1,"val":"productId","end":""},{"old":"/seller/products/:productId/images/:id","type":0,"val":"images","end":""},{"old":"/seller/products/:productId/images/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.images.destroy']['types'],
  },
  'seller.collections.index': {
    methods: ["GET","HEAD"],
    pattern: '/seller/collections',
    tokens: [{"old":"/seller/collections","type":0,"val":"seller","end":""},{"old":"/seller/collections","type":0,"val":"collections","end":""}],
    types: placeholder as Registry['seller.collections.index']['types'],
  },
  'seller.collections.store': {
    methods: ["POST"],
    pattern: '/seller/collections',
    tokens: [{"old":"/seller/collections","type":0,"val":"seller","end":""},{"old":"/seller/collections","type":0,"val":"collections","end":""}],
    types: placeholder as Registry['seller.collections.store']['types'],
  },
  'seller.collections.update': {
    methods: ["PATCH"],
    pattern: '/seller/collections/:id',
    tokens: [{"old":"/seller/collections/:id","type":0,"val":"seller","end":""},{"old":"/seller/collections/:id","type":0,"val":"collections","end":""},{"old":"/seller/collections/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.collections.update']['types'],
  },
  'seller.collections.destroy': {
    methods: ["DELETE"],
    pattern: '/seller/collections/:id',
    tokens: [{"old":"/seller/collections/:id","type":0,"val":"seller","end":""},{"old":"/seller/collections/:id","type":0,"val":"collections","end":""},{"old":"/seller/collections/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.collections.destroy']['types'],
  },
  'seller.orders.index': {
    methods: ["GET","HEAD"],
    pattern: '/seller/orders',
    tokens: [{"old":"/seller/orders","type":0,"val":"seller","end":""},{"old":"/seller/orders","type":0,"val":"orders","end":""}],
    types: placeholder as Registry['seller.orders.index']['types'],
  },
  'seller.orders.show': {
    methods: ["GET","HEAD"],
    pattern: '/seller/orders/:id',
    tokens: [{"old":"/seller/orders/:id","type":0,"val":"seller","end":""},{"old":"/seller/orders/:id","type":0,"val":"orders","end":""},{"old":"/seller/orders/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.orders.show']['types'],
  },
  'seller.orders.update': {
    methods: ["PATCH"],
    pattern: '/seller/orders/:id',
    tokens: [{"old":"/seller/orders/:id","type":0,"val":"seller","end":""},{"old":"/seller/orders/:id","type":0,"val":"orders","end":""},{"old":"/seller/orders/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.orders.update']['types'],
  },
  'seller.users.index': {
    methods: ["GET","HEAD"],
    pattern: '/seller/users',
    tokens: [{"old":"/seller/users","type":0,"val":"seller","end":""},{"old":"/seller/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['seller.users.index']['types'],
  },
  'seller.users.store': {
    methods: ["POST"],
    pattern: '/seller/users',
    tokens: [{"old":"/seller/users","type":0,"val":"seller","end":""},{"old":"/seller/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['seller.users.store']['types'],
  },
  'seller.users.update': {
    methods: ["PATCH"],
    pattern: '/seller/users/:id',
    tokens: [{"old":"/seller/users/:id","type":0,"val":"seller","end":""},{"old":"/seller/users/:id","type":0,"val":"users","end":""},{"old":"/seller/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.users.update']['types'],
  },
  'seller.users.destroy': {
    methods: ["DELETE"],
    pattern: '/seller/users/:id',
    tokens: [{"old":"/seller/users/:id","type":0,"val":"seller","end":""},{"old":"/seller/users/:id","type":0,"val":"users","end":""},{"old":"/seller/users/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['seller.users.destroy']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
