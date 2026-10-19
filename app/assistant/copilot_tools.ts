import { tool } from 'ai'
import type { HttpContext } from '@adonisjs/core/http'
import type { ContainerResolver } from '@adonisjs/core/container'
import type User from '#models/account/user'
import UserModel from '#models/account/user'
import Order from '#models/checkout/order'
import Product from '#models/catalog/product'
import DiscountCode from '#models/checkout/discount_code'
import BlogPost from '#models/content/blog_post'
import AssistantConversation from '#models/assistant/assistant_conversation'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import type SummaryService from '#services/dashboard/summary_service'
import type OrderQueueService from '#services/seller/order_queue_service'
import type SellerReviewService from '#services/seller/review_service'
import type CopilotProposalService from '#services/assistant/copilot_proposal_service'
import { serializer } from '#providers/api_provider'
import SellerOrderTransformer from '#transformers/seller/order_transformer'
import OrderQueueItemTransformer from '#transformers/seller/order_queue_item_transformer'
import SellerProductTransformer from '#transformers/seller/product_transformer'
import SellerDiscountTransformer from '#transformers/seller/discount_transformer'
import SellerUserTransformer from '#transformers/seller/user_transformer'
import SellerReviewTransformer from '#transformers/seller/review_transformer'
import SellerPostTransformer from '#transformers/seller/post_transformer'
import SummaryTransformer from '#transformers/dashboard/summary_transformer'
import StoreSettingTransformer from '#transformers/settings/store_setting_transformer'
import {
  copilotConversationContext,
  getCustomerInput,
  getOrderInput,
  getPostInput,
  getProductInput,
  getStoreSettingsInput,
  listDiscountsInput,
  listReviewsInput,
  listUsersInput,
  noteUnansweredInput,
  offerSuggestionsInput,
  proposeChangeInput,
  salesSummaryInput,
  searchCustomersInput,
  searchOrdersInput,
  searchPostsInput,
  searchProductsInput,
} from '#validators/assistant/copilot_tool'

/** What the copilot's tools read through: the dashboard's own query paths and transformers. */
export type CopilotToolDeps = {
  summary: SummaryService
  queue: OrderQueueService
  reviews: SellerReviewService
  proposals: CopilotProposalService
  /** The request's resolver, so transformers that check the person's permissions can. */
  resolver: ContainerResolver<any>
  /** Whether the deployment has an AI key, as store settings report it. */
  aiConfigured: boolean
}

/** A LIKE pattern matching the text anywhere, with the wildcard characters escaped. */
const contains = (text: string) => '%' + text.replace(/[\\%_]/g, '\\$&') + '%'

/** Everything the order page shows staff, loaded the way that page loads it. */
const orderQuery = () =>
  Order.query()
    .preload('user')
    .preload('addresses')
    .preload('lineItems')
    .preload('payments')
    .preload('shipments')
    .preload('refunds')

/** Read tools for every area the person's dashboard shows them. */
async function readTools(bouncer: HttpContext['bouncer'], deps: CopilotToolDeps) {
  const { resolver } = deps
  const allows = {
    orders: await bouncer.with('SellerOrderPolicy').allows('viewAny'),
    products: await bouncer.with('SellerProductPolicy').allows('viewAny'),
    discounts: await bouncer.with('SellerDiscountPolicy').allows('viewAny'),
    reviews: await bouncer.with('SellerReviewPolicy').allows('viewAny'),
    posts: await bouncer.with('SellerPostPolicy').allows('viewAny'),
    sales: await bouncer.with('SellerAccessPolicy').allows('access'),
    // The dashboard's customer list is the admin-only Users page.
    users: await bouncer.with('SellerUserPolicy').allows('viewAny'),
    settings: await bouncer.with(StoreSettingPolicy).allows('update'),
  }

  const orders = {
    searchOrders: tool({
      description:
        "Search the store's orders by number or customer email, optionally within one stage of the order queue. Returns up to 20 orders, newest first, with their stages and next step.",
      inputSchema: searchOrdersInput,
      execute: async ({ query, stage }) => {
        const needle = query?.toLowerCase()
        // The queue calls shipped orders "in transit".
        const queueStage = stage === 'shipped' ? 'in_transit' : stage
        const queue = await deps.queue.list()
        const items = queue.filter(
          (item) =>
            (!queueStage || queueStage === 'all' || item.stages.includes(queueStage)) &&
            (!needle ||
              item.order.number.toLowerCase().includes(needle) ||
              (item.order.email ?? '').toLowerCase().includes(needle))
        )
        return serializer.serializeWithoutWrapping(
          OrderQueueItemTransformer.transform(items.slice(0, 20)),
          resolver
        )
      },
    }),
    getOrder: tool({
      description:
        'Look up one order by its number: status, items, totals, customer contact details, addresses, payments, refunds and shipment. Returns found: false when there is no such order.',
      inputSchema: getOrderInput,
      execute: async ({ orderNumber }) => {
        const order = await orderQuery().where('number', orderNumber).first()
        if (!order) return { found: false as const }
        const [detail, queue] = await Promise.all([
          serializer.serializeWithoutWrapping(
            SellerOrderTransformer.transform(order).depth(3),
            resolver
          ),
          serializer.serializeWithoutWrapping(
            OrderQueueItemTransformer.transform(await deps.queue.forOrder(order)),
            resolver
          ),
        ])
        return { found: true as const, order: detail, queue }
      },
    }),
  }

  const products = {
    searchProducts: tool({
      description:
        "Search the store's products by title, handle or SKU, whatever their status. Returns up to 10 products with every variant's price and stock counts.",
      inputSchema: searchProductsInput,
      execute: async ({ query }) => {
        const pattern = contains(query)
        const found = await Product.query()
          .where((builder) =>
            builder
              .whereILike('title', pattern)
              .orWhereILike('handle', pattern)
              .orWhereHas('variants', (variants) => variants.whereILike('sku', pattern))
          )
          .preload('variants', (variants) => variants.orderBy('position'))
          .orderBy('id', 'desc')
          .limit(10)
        return serializer.serializeWithoutWrapping(
          SellerProductTransformer.transform(found),
          resolver
        )
      },
    }),
    getProduct: tool({
      description:
        'Get one product by its id: details, status, and every variant with its price, stock on hand, stock held by pending orders and stock available.',
      inputSchema: getProductInput,
      execute: async ({ id }) => {
        const product = await Product.query()
          .where('id', id)
          .preload('variants', (variants) => variants.orderBy('position'))
          .first()
        if (!product) return { found: false as const }
        return {
          found: true as const,
          product: await serializer.serializeWithoutWrapping(
            SellerProductTransformer.transform(product),
            resolver
          ),
        }
      },
    }),
  }

  const discounts = {
    listDiscounts: tool({
      description: "List the store's discount codes with their terms, usage and whether active.",
      inputSchema: listDiscountsInput,
      execute: async ({ active }) => {
        const query = DiscountCode.query().orderBy('id', 'desc').limit(50)
        if (active !== undefined) query.where('active', active)
        return serializer.serializeWithoutWrapping(
          SellerDiscountTransformer.transform(await query),
          resolver
        )
      },
    }),
  }

  const customers = {
    searchCustomers: tool({
      description:
        "Search the store's customers by name or email. Returns up to 10 customers with their contact details.",
      inputSchema: searchCustomersInput,
      execute: async ({ query }) => {
        const pattern = contains(query)
        const found = await UserModel.query()
          .where('role', 'customer')
          .where((builder) =>
            builder.whereILike('full_name', pattern).orWhereILike('email', pattern)
          )
          .orderBy('id', 'desc')
          .limit(10)
        return serializer.serializeWithoutWrapping(SellerUserTransformer.transform(found), resolver)
      },
    }),
    getCustomer: tool({
      description:
        "Get one customer by id: contact details, saved addresses and their 10 most recent orders' numbers and statuses.",
      inputSchema: getCustomerInput,
      execute: async ({ id }) => {
        const customer = await UserModel.query().where('id', id).preload('addresses').first()
        if (!customer) return { found: false as const }
        const recent = await customer
          .related('orders')
          .query()
          .orderBy('processed_at', 'desc')
          .limit(10)
        return {
          found: true as const,
          customer: await serializer.serializeWithoutWrapping(
            SellerUserTransformer.transform(customer),
            resolver
          ),
          addresses: customer.addresses.map((address) => address.serialize()),
          orders: recent.map((order) => ({
            id: order.id,
            number: order.number,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            totalAmount: order.totalAmount,
          })),
        }
      },
    }),
  }

  const reviews = {
    listReviews: tool({
      description: 'List product reviews, newest first, optionally by moderation status.',
      inputSchema: listReviewsInput,
      execute: async ({ status }) => {
        const page = await deps.reviews.list(status ?? 'all', 1, 25)
        return serializer.serializeWithoutWrapping(
          SellerReviewTransformer.transform(page.all()),
          resolver
        )
      },
    }),
  }

  const posts = {
    searchPosts: tool({
      description: "Search the store's blog posts by title, drafts included.",
      inputSchema: searchPostsInput,
      execute: async ({ query }) => {
        const found = BlogPost.query().preload('author').orderBy('updated_at', 'desc').limit(20)
        if (query) found.whereILike('title', contains(query))
        return serializer.serializeWithoutWrapping(
          SellerPostTransformer.transform(await found),
          resolver
        )
      },
    }),
    getPost: tool({
      description: 'Read one blog post by id, including its text.',
      inputSchema: getPostInput,
      execute: async ({ id }) => {
        const post = await BlogPost.query().where('id', id).preload('author').first()
        if (!post) return { found: false as const }
        return {
          found: true as const,
          post: {
            ...(await serializer.serializeWithoutWrapping(
              SellerPostTransformer.transform(post),
              resolver
            )),
            contentHtml: post.contentHtml,
          },
        }
      },
    }),
  }

  const sales = {
    salesSummary: tool({
      description:
        "The store's sales between two dates (inclusive, store time): gross sales, paid orders, average order, new customers, each compared with the period before, and recent orders.",
      inputSchema: salesSummaryInput,
      execute: async ({ from, to }) => {
        const summary = await deps.summary.summarize({
          start: from.toISODate()!,
          end: to.toISODate()!,
        })
        return serializer.serializeWithoutWrapping(SummaryTransformer.transform(summary), resolver)
      },
    }),
  }

  const users = {
    listUsers: tool({
      description: "List the store's user accounts (customers, staff and admins) with their roles.",
      inputSchema: listUsersInput,
      execute: async () =>
        serializer.serializeWithoutWrapping(
          SellerUserTransformer.transform(await UserModel.query().orderBy('id', 'desc').limit(100)),
          resolver
        ),
    }),
  }

  const settings = {
    getStoreSettings: tool({
      description:
        "The store's settings: name, contact email, shipping fee, and whether the shopping assistant and copilot are on.",
      inputSchema: getStoreSettingsInput,
      execute: async () =>
        serializer.serializeWithoutWrapping(
          StoreSettingTransformer.transform(await StoreSetting.current(), {
            assistantConfigured: deps.aiConfigured,
          }),
          resolver
        ),
    }),
  }

  return {
    ...(allows.orders ? orders : {}),
    ...(allows.products ? products : {}),
    ...(allows.discounts ? discounts : {}),
    ...(allows.users ? customers : {}),
    ...(allows.reviews ? reviews : {}),
    ...(allows.posts ? posts : {}),
    ...(allows.sales ? sales : {}),
    ...(allows.users ? users : {}),
    ...(allows.settings ? settings : {}),
  } as Partial<typeof orders> &
    Partial<typeof products> &
    Partial<typeof discounts> &
    Partial<typeof customers> &
    Partial<typeof reviews> &
    Partial<typeof posts> &
    Partial<typeof sales> &
    Partial<typeof users> &
    Partial<typeof settings>
}

/** Tools every copilot conversation has, whatever the person may read. */
function conversationTools(actor: User, bouncer: HttpContext['bouncer'], deps: CopilotToolDeps) {
  return {
    // The decline is recognised from this tool part, never from the reply's wording.
    offerSuggestions: tool({
      description:
        "Call this when you decline a request that isn't about this store's orders, products, customers, content or sales. The person is shown suggested questions.",
      inputSchema: offerSuggestionsInput,
      execute: async () => ({ offered: true as const }),
    }),

    // Admins filter for conversations the copilot couldn't answer.
    noteUnanswered: tool({
      description:
        "Call this whenever you say you don't know, can't find the answer, or decline a request.",
      inputSchema: noteUnansweredInput,
      contextSchema: copilotConversationContext,
      execute: async (_input, { context }) => {
        const conversation = await AssistantConversation.find(context.conversationId)
        await conversation?.markUnanswered()
        return { noted: true as const }
      },
    }),

    proposeChange: tool({
      description: [
        'Propose a change for the person to confirm with Apply or Not now; nothing changes until they do.',
        'Actions and the fields their changes may set:',
        'product_update (title, handle, description, vendor, productType, status: draft|active|archived);',
        'variant_update (title, sku, price, compareAtPrice, availableForSale);',
        'stock_adjust (stock: the new on-hand count);',
        'collection_create / collection_update (title, handle, description, published, productIds);',
        'order_pack (no fields: pass { "pack": true }); order_ship (carrier, trackingNumber, trackingUrl);',
        'order_deliver (no fields: pass { "deliver": true }); order_note (note);',
        'discount_create / discount_update (code, description, kind: percentage|fixed, percentOff, amountOff, minimumSubtotal, usageLimit, oncePerCustomer, active, startsAt, endsAt);',
        'review_moderate (status: approved|hidden);',
        'post_create / post_update (title, handle, excerpt, badge, body, status: draft|published).',
        "recordId is the record's id, or null for a create (one item only). At most 25 items.",
        'Returns error when the change is not allowed or not valid; explain it to the person.',
      ].join(' '),
      inputSchema: proposeChangeInput,
      contextSchema: copilotConversationContext,
      execute: async (input, { context }) => {
        const conversation = await AssistantConversation.findOrFail(context.conversationId)
        const result = await deps.proposals.propose(conversation, actor, bouncer, input)
        if ('error' in result) return result
        return { proposalId: result.id }
      },
    }),
  }
}

/**
 * The AI SDK tool set for one person. Read tools exist only for areas that person's dashboard
 * shows them; changes are only ever proposed, never made.
 */
export async function copilotTools(
  actor: User,
  bouncer: HttpContext['bouncer'],
  deps: CopilotToolDeps
) {
  return { ...(await readTools(bouncer, deps)), ...conversationTools(actor, bouncer, deps) }
}

export type CopilotTools = Awaited<ReturnType<typeof copilotTools>>
