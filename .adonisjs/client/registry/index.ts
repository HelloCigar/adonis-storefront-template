/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
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
