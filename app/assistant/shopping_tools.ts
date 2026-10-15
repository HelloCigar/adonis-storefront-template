import { tool } from 'ai'
import Collection from '#models/catalog/collection'
import type CatalogueService from '#services/catalog/catalogue_service'
import AssistantProductTransformer from '#transformers/assistant/assistant_product_transformer'
import { serializer } from '#providers/api_provider'
import {
  conversationContext,
  getMyOrderInput,
  proposeAddToCartInput,
  listMyOrdersInput,
  offerSuggestionsInput,
  searchProductsInput,
  shopperContext,
} from '#validators/assistant/shopping_tool'
import User from '#models/account/user'
import type Order from '#models/checkout/order'
import OrderTransformer from '#transformers/checkout/order_transformer'
import { DateTime } from 'luxon'
import ProductVariant from '#models/catalog/product_variant'
import AssistantProposal from '#models/assistant/assistant_proposal'
import AssistantProposalTransformer from '#transformers/assistant/assistant_proposal_transformer'
import { assistantLimits } from '#values/assistant'

/** What the shopping tools read through: the storefront's own query paths. */
export type ShoppingToolDeps = {
  catalogue: CatalogueService
}

/** What the shopper's order page shows: the order itself, plus its shipment's tracking. */
async function orderAnswer(order: Order) {
  const shipment = order.shipments.at(-1)
  return {
    ...(await serializer.serializeWithoutWrapping(OrderTransformer.transform(order))),
    tracking: shipment
      ? {
          carrier: shipment.carrier,
          trackingNumber: shipment.trackingNumber,
          trackingUrl: shipment.trackingUrl,
        }
      : null,
  }
}

/** Only ever the signed-in shopper's own orders, with the account order page's preloads. */
function shopperOrders(shopper: User) {
  return shopper
    .related('orders')
    .query()
    .preload('lineItems')
    .preload('addresses')
    .preload('shipments', (query) => query.orderBy('id'))
}

/** Read-only tools over what the storefront already shows anyone, and the shopper's own orders. */
export function shoppingTools(deps: ShoppingToolDeps) {
  return {
    searchProducts: tool({
      description:
        "Search the store's products by name, optionally within one collection (by its handle). Returns up to 6 products with price and whether they are in stock.",
      inputSchema: searchProductsInput,
      execute: async ({ query, collection }) => {
        let { products } = await deps.catalogue.search(query)
        if (collection) {
          const found = await Collection.query()
            .withScopes((scopes) => scopes.published())
            .where('handle', collection)
            .preload('products')
            .first()
          const ids = new Set(found?.products.map((product) => product.id) ?? [])
          products = products.filter((product) => ids.has(product.id))
        }
        return serializer.serializeWithoutWrapping(
          AssistantProductTransformer.transform(products.slice(0, 6))
        )
      },
    }),

    listMyOrders: tool({
      description:
        "List the signed-in shopper's orders with their status. Returns signInRequired when the shopper is signed out.",
      inputSchema: listMyOrdersInput,
      contextSchema: shopperContext,
      execute: async (_input, { context }) => {
        const shopper = context.shopperId ? await User.find(context.shopperId) : null
        if (!shopper) return { signInRequired: true as const }
        const orders = await shopperOrders(shopper).orderBy('processed_at', 'desc').limit(10)
        return { orders: await Promise.all(orders.map(orderAnswer)) }
      },
    }),

    getMyOrder: tool({
      description:
        "Look up one of the signed-in shopper's orders by its number: status, items, totals, shipping details and tracking. Returns signInRequired when signed out, or found: false when the shopper has no order with that number.",
      inputSchema: getMyOrderInput,
      contextSchema: shopperContext,
      execute: async ({ orderNumber }, { context }) => {
        const shopper = context.shopperId ? await User.find(context.shopperId) : null
        if (!shopper) return { signInRequired: true as const }
        // Someone else's order and one that doesn't exist give the same answer.
        const order = await shopperOrders(shopper).where('number', orderNumber).first()
        if (!order) return { found: false as const }
        return { found: true as const, order: await orderAnswer(order) }
      },
    }),

    proposeAddToCart: tool({
      description:
        "Offer to add a product variant to the shopper's cart (quantity 1 to 10). The shopper confirms with Add or Not now; this does not change the cart.",
      inputSchema: proposeAddToCartInput,
      contextSchema: conversationContext,
      execute: async ({ variantId, quantity }, { context }) => {
        const variant = await ProductVariant.query()
          .where('id', variantId)
          .whereHas('product', (query) => query.withScopes((scopes) => scopes.published()))
          .preload('product')
          .first()
        // An unsellable variant never becomes a proposal; the model is told so instead.
        if (!variant?.isSellable) return { unavailable: true as const }
        const proposal = await AssistantProposal.create({
          conversationId: context.conversationId,
          productVariantId: variant.id,
          quantity,
          unitPriceAmount: variant.priceAmount,
          currencyCode: variant.currencyCode,
          expiresAt: DateTime.now().plus({ minutes: assistantLimits.proposalTtlMinutes }),
        })
        proposal.$setRelated('variant', variant)
        return serializer.serializeWithoutWrapping(AssistantProposalTransformer.transform(proposal))
      },
    }),

    // The decline is recognised from this tool part, never from the reply's wording.
    offerSuggestions: tool({
      description:
        "Call this when you decline a request that isn't about this store's products, orders, shipping or policies. The shopper is shown suggested questions.",
      inputSchema: offerSuggestionsInput,
      execute: async () => ({ offered: true as const }),
    }),
  }
}

export type ShoppingTools = ReturnType<typeof shoppingTools>
