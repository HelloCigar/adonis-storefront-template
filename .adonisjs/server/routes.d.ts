import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home': { paramsTuple?: []; params?: {} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blogs.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'articles.show': { paramsTuple: [ParamValue,ParamValue]; params: {'handle': ParamValue,'article': ParamValue} }
    'cart.add': { paramsTuple?: []; params?: {} }
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
  }
  GET: {
    'home': { paramsTuple?: []; params?: {} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blogs.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'articles.show': { paramsTuple: [ParamValue,ParamValue]; params: {'handle': ParamValue,'article': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.logout': { paramsTuple?: []; params?: {} }
    'orders.index': { paramsTuple?: []; params?: {} }
    'orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'inbox': { paramsTuple?: []; params?: {} }
    'customers': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.security': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home': { paramsTuple?: []; params?: {} }
    'collections.index': { paramsTuple?: []; params?: {} }
    'collections.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'products.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'pages.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'policies.index': { paramsTuple?: []; params?: {} }
    'policies.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'blogs.show': { paramsTuple: [ParamValue]; params: {'handle': ParamValue} }
    'articles.show': { paramsTuple: [ParamValue,ParamValue]; params: {'handle': ParamValue,'article': ParamValue} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'account.show': { paramsTuple?: []; params?: {} }
    'account.logout': { paramsTuple?: []; params?: {} }
    'orders.index': { paramsTuple?: []; params?: {} }
    'orders.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'inbox': { paramsTuple?: []; params?: {} }
    'customers': { paramsTuple?: []; params?: {} }
    'settings': { paramsTuple?: []; params?: {} }
    'settings.members': { paramsTuple?: []; params?: {} }
    'settings.notifications': { paramsTuple?: []; params?: {} }
    'settings.security': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'cart.add': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'account.addresses.create': { paramsTuple?: []; params?: {} }
    'account.addresses.default': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.update': { paramsTuple?: []; params?: {} }
    'settings.password.update': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'cart.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.profile.update': { paramsTuple?: []; params?: {} }
    'account.addresses.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'cart.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'account.addresses.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.avatar.destroy': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}