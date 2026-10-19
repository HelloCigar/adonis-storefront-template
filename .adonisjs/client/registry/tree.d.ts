/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  home: typeof routes['home']
  attachments: {
    show: typeof routes['attachments.show']
  }
  collections: {
    index: typeof routes['collections.index']
    show: typeof routes['collections.show']
  }
  products: {
    show: typeof routes['products.show']
  }
  pages: {
    show: typeof routes['pages.show']
  }
  policies: {
    index: typeof routes['policies.index']
    show: typeof routes['policies.show']
  }
  blog: {
    index: typeof routes['blog.index']
    show: typeof routes['blog.show']
  }
  cart: {
    recover: typeof routes['cart.recover']
    add: typeof routes['cart.add']
    update: typeof routes['cart.update']
    remove: typeof routes['cart.remove']
  }
  cartReminders: {
    unsubscribe: {
      show: typeof routes['cart_reminders.unsubscribe.show']
      store: typeof routes['cart_reminders.unsubscribe.store']
    }
  }
  checkout: {
    create: typeof routes['checkout.create']
    store: typeof routes['checkout.store']
    discount: {
      store: typeof routes['checkout.discount.store']
      destroy: typeof routes['checkout.discount.destroy']
    }
    access: {
      show: typeof routes['checkout.access.show']
      store: typeof routes['checkout.access.store']
    }
    orders: {
      show: typeof routes['checkout.orders.show']
    }
    invoices: {
      show: typeof routes['checkout.invoices.show']
    }
    cancellations: {
      store: typeof routes['checkout.cancellations.store']
    }
    reconciliations: {
      store: typeof routes['checkout.reconciliations.store']
    }
  }
  payments: {
    webhooks: {
      store: typeof routes['payments.webhooks.store']
    }
    simulations: {
      show: typeof routes['payments.simulations.show']
      store: typeof routes['payments.simulations.store']
    }
  }
  assistant: {
    conversations: {
      index: typeof routes['assistant.conversations.index']
      store: typeof routes['assistant.conversations.store']
      show: typeof routes['assistant.conversations.show']
      destroy: typeof routes['assistant.conversations.destroy']
      messages: {
        store: typeof routes['assistant.conversations.messages.store']
      }
    }
    proposals: {
      update: typeof routes['assistant.proposals.update']
    }
  }
  emailVerifications: {
    show: typeof routes['email_verifications.show']
    update: typeof routes['email_verifications.update']
    store: typeof routes['email_verifications.store']
    create: typeof routes['email_verifications.create']
  }
  passwordResets: {
    show: typeof routes['password_resets.show']
    update: typeof routes['password_resets.update']
    create: typeof routes['password_resets.create']
    store: typeof routes['password_resets.store']
  }
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  passkeyLoginChallenges: {
    store: typeof routes['passkey_login_challenges.store']
  }
  passkeySession: {
    store: typeof routes['passkey_session.store']
  }
  account: {
    show: typeof routes['account.show']
    logout: typeof routes['account.logout']
    profile: {
      show: typeof routes['account.profile.show']
    }
    security: {
      show: typeof routes['account.security.show']
    }
    addresses: {
      index: typeof routes['account.addresses.index']
      create: typeof routes['account.addresses.create']
      update: typeof routes['account.addresses.update']
      default: typeof routes['account.addresses.default']
      delete: typeof routes['account.addresses.delete']
    }
    cartReminders: {
      update: typeof routes['account.cart_reminders.update']
    }
  }
  reviews: {
    store: typeof routes['reviews.store']
    update: typeof routes['reviews.update']
    destroy: typeof routes['reviews.destroy']
  }
  orders: {
    index: typeof routes['orders.index']
    show: typeof routes['orders.show']
  }
  chat: {
    messages: {
      store: typeof routes['chat.messages.store']
    }
    images: {
      show: typeof routes['chat.images.show']
    }
  }
  dashboard: typeof routes['dashboard']
  launchChecklist: {
    destroy: typeof routes['launch_checklist.destroy']
  }
  inbox: typeof routes['inbox']
  customers: typeof routes['customers']
  setup: {
    index: typeof routes['setup.index']
    show: typeof routes['setup.show']
    update: typeof routes['setup.update']
  }
  settings: typeof routes['settings'] & {
    storePolicies: {
      edit: typeof routes['settings.store_policies.edit']
      update: typeof routes['settings.store_policies.update']
    }
    shoppingAssistant: {
      update: typeof routes['settings.shopping_assistant.update']
    }
    store: {
      edit: typeof routes['settings.store.edit']
      update: typeof routes['settings.store.update']
    }
    update: typeof routes['settings.update']
    avatar: {
      destroy: typeof routes['settings.avatar.destroy']
    }
    members: typeof routes['settings.members']
    security: typeof routes['settings.security']
    password: {
      update: typeof routes['settings.password.update']
    }
  }
  passkeyRegistrationChallenges: {
    store: typeof routes['passkey_registration_challenges.store']
  }
  passkeys: {
    store: typeof routes['passkeys.store']
    update: typeof routes['passkeys.update']
    destroy: typeof routes['passkeys.destroy']
  }
  seller: {
    products: {
      index: typeof routes['seller.products.index']
      store: typeof routes['seller.products.store']
      show: typeof routes['seller.products.show']
      update: typeof routes['seller.products.update']
      destroy: typeof routes['seller.products.destroy']
    }
    variants: {
      index: typeof routes['seller.variants.index']
      store: typeof routes['seller.variants.store']
      update: typeof routes['seller.variants.update']
      destroy: typeof routes['seller.variants.destroy']
    }
    options: {
      update: typeof routes['seller.options.update']
    }
    variantGeneration: {
      store: typeof routes['seller.variant_generation.store']
    }
    stockAdjustments: {
      index: typeof routes['seller.stock_adjustments.index']
      store: typeof routes['seller.stock_adjustments.store']
    }
    images: {
      store: typeof routes['seller.images.store']
      destroy: typeof routes['seller.images.destroy']
    }
    collections: {
      index: typeof routes['seller.collections.index']
      store: typeof routes['seller.collections.store']
      update: typeof routes['seller.collections.update']
      destroy: typeof routes['seller.collections.destroy']
    }
    discounts: {
      index: typeof routes['seller.discounts.index']
      store: typeof routes['seller.discounts.store']
      update: typeof routes['seller.discounts.update']
      destroy: typeof routes['seller.discounts.destroy']
    }
    reviews: {
      index: typeof routes['seller.reviews.index']
      update: typeof routes['seller.reviews.update']
    }
    posts: {
      index: typeof routes['seller.posts.index']
      create: typeof routes['seller.posts.create']
      store: typeof routes['seller.posts.store']
      edit: typeof routes['seller.posts.edit']
      update: typeof routes['seller.posts.update']
      destroy: typeof routes['seller.posts.destroy']
    }
    orders: {
      index: typeof routes['seller.orders.index']
      show: typeof routes['seller.orders.show']
      update: typeof routes['seller.orders.update']
    }
    packing: {
      store: typeof routes['seller.packing.store']
    }
    shipments: {
      store: typeof routes['seller.shipments.store']
    }
    deliveries: {
      store: typeof routes['seller.deliveries.store']
    }
    refunds: {
      store: typeof routes['seller.refunds.store']
    }
    cancellations: {
      store: typeof routes['seller.cancellations.store']
    }
    operations: {
      store: typeof routes['seller.operations.store']
    }
    users: {
      index: typeof routes['seller.users.index']
      store: typeof routes['seller.users.store']
      update: typeof routes['seller.users.update']
      destroy: typeof routes['seller.users.destroy']
    }
    emails: {
      index: typeof routes['seller.emails.index']
      show: typeof routes['seller.emails.show']
    }
  }
}
