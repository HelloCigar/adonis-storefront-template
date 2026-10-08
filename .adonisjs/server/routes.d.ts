import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'attachments.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'name'?: ParamValue} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blog.index': { paramsTuple?: []; params?: {} }
    'blog.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'cart.add': { paramsTuple?: []; params?: {} }
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'checkout.create': { paramsTuple?: []; params?: {} }
    'checkout.store': { paramsTuple?: []; params?: {} }
    'checkout.discount.store': { paramsTuple?: []; params?: {} }
    'checkout.discount.destroy': { paramsTuple?: []; params?: {} }
    'checkout.access.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.access.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.orders.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.invoices.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.cancellations.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.reconciliations.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'payments.webhooks.store': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'payments.simulations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'payments.simulations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.logout': { paramsTuple?: []; params?: {} }
    'account.profile.update': { paramsTuple?: []; params?: {} }
    'account.addresses.create': { paramsTuple?: []; params?: {} }
    'account.addresses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.addresses.default': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.addresses.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'orders.index': { paramsTuple?: []; params?: {} }
    'orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'chat.messages.store': { paramsTuple: [ParamValue]; params: {'orderId': ParamValue} }
    'chat.images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orderId': ParamValue,'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'inbox': { paramsTuple?: []; params?: {} }
    'customers': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.avatar.destroy': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.security': { paramsTuple?: []; params?: {} }
    'settings.password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'seller.products.index': { paramsTuple?: []; params?: {} }
    'seller.products.store': { paramsTuple?: []; params?: {} }
    'seller.products.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.products.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.variants.index': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.variants.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.variants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.variants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.options.update': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.variant_generation.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.stock_adjustments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'variantId': ParamValue} }
    'seller.stock_adjustments.store': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'variantId': ParamValue} }
    'seller.images.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.images.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.collections.index': { paramsTuple?: []; params?: {} }
    'seller.collections.store': { paramsTuple?: []; params?: {} }
    'seller.collections.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.collections.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.discounts.index': { paramsTuple?: []; params?: {} }
    'seller.discounts.store': { paramsTuple?: []; params?: {} }
    'seller.discounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.discounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.index': { paramsTuple?: []; params?: {} }
    'seller.posts.create': { paramsTuple?: []; params?: {} }
    'seller.posts.store': { paramsTuple?: []; params?: {} }
    'seller.posts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.index': { paramsTuple?: []; params?: {} }
    'seller.orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.packing.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.shipments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.deliveries.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.refunds.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.cancellations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.operations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.index': { paramsTuple?: []; params?: {} }
    'seller.users.store': { paramsTuple?: []; params?: {} }
    'seller.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.emails.index': { paramsTuple?: []; params?: {} }
    'seller.emails.show': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'attachments.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'name'?: ParamValue} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blog.index': { paramsTuple?: []; params?: {} }
    'blog.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'checkout.create': { paramsTuple?: []; params?: {} }
    'checkout.access.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.orders.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.invoices.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'payments.simulations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.logout': { paramsTuple?: []; params?: {} }
    'orders.index': { paramsTuple?: []; params?: {} }
    'orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'chat.images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orderId': ParamValue,'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'inbox': { paramsTuple?: []; params?: {} }
    'customers': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.security': { paramsTuple?: []; params?: {} }
    'seller.products.index': { paramsTuple?: []; params?: {} }
    'seller.variants.index': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.stock_adjustments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'variantId': ParamValue} }
    'seller.collections.index': { paramsTuple?: []; params?: {} }
    'seller.discounts.index': { paramsTuple?: []; params?: {} }
    'seller.posts.index': { paramsTuple?: []; params?: {} }
    'seller.posts.create': { paramsTuple?: []; params?: {} }
    'seller.posts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.index': { paramsTuple?: []; params?: {} }
    'seller.orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.index': { paramsTuple?: []; params?: {} }
    'seller.emails.index': { paramsTuple?: []; params?: {} }
    'seller.emails.show': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'attachments.show': { paramsTuple: [ParamValue,ParamValue?]; params: {'id': ParamValue,'name'?: ParamValue} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blog.index': { paramsTuple?: []; params?: {} }
    'blog.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'checkout.create': { paramsTuple?: []; params?: {} }
    'checkout.access.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.orders.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.invoices.show': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'payments.simulations.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.logout': { paramsTuple?: []; params?: {} }
    'orders.index': { paramsTuple?: []; params?: {} }
    'orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'chat.images.show': { paramsTuple: [ParamValue,ParamValue]; params: {'orderId': ParamValue,'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'inbox': { paramsTuple?: []; params?: {} }
    'customers': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.security': { paramsTuple?: []; params?: {} }
    'seller.products.index': { paramsTuple?: []; params?: {} }
    'seller.variants.index': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.stock_adjustments.index': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'variantId': ParamValue} }
    'seller.collections.index': { paramsTuple?: []; params?: {} }
    'seller.discounts.index': { paramsTuple?: []; params?: {} }
    'seller.posts.index': { paramsTuple?: []; params?: {} }
    'seller.posts.create': { paramsTuple?: []; params?: {} }
    'seller.posts.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.index': { paramsTuple?: []; params?: {} }
    'seller.orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.index': { paramsTuple?: []; params?: {} }
    'seller.emails.index': { paramsTuple?: []; params?: {} }
    'seller.emails.show': { paramsTuple: [ParamValue]; params: {'email': ParamValue} }
  }
  POST: {
    'cart.add': { paramsTuple?: []; params?: {} }
    'checkout.store': { paramsTuple?: []; params?: {} }
    'checkout.discount.store': { paramsTuple?: []; params?: {} }
    'checkout.access.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.cancellations.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'checkout.reconciliations.store': { paramsTuple: [ParamValue]; params: {'publicId': ParamValue} }
    'payments.webhooks.store': { paramsTuple: [ParamValue]; params: {'provider': ParamValue} }
    'payments.simulations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'account.addresses.create': { paramsTuple?: []; params?: {} }
    'account.addresses.default': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'chat.messages.store': { paramsTuple: [ParamValue]; params: {'orderId': ParamValue} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'seller.products.store': { paramsTuple?: []; params?: {} }
    'seller.variants.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.variant_generation.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.stock_adjustments.store': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'variantId': ParamValue} }
    'seller.images.store': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.collections.store': { paramsTuple?: []; params?: {} }
    'seller.discounts.store': { paramsTuple?: []; params?: {} }
    'seller.posts.store': { paramsTuple?: []; params?: {} }
    'seller.packing.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.shipments.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.deliveries.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.refunds.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.cancellations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.operations.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.store': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.profile.update': { paramsTuple?: []; params?: {} }
    'account.addresses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.products.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.variants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.options.update': { paramsTuple: [ParamValue]; params: {'productId': ParamValue} }
    'seller.collections.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.discounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'checkout.discount.destroy': { paramsTuple?: []; params?: {} }
    'account.addresses.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.avatar.destroy': { paramsTuple?: []; params?: {} }
    'seller.products.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.variants.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.images.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.collections.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.discounts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'seller.products.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.variants.update': { paramsTuple: [ParamValue,ParamValue]; params: {'productId': ParamValue,'id': ParamValue} }
    'seller.collections.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.discounts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.posts.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.orders.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'seller.users.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}