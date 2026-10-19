import type { HttpContext } from '@adonisjs/core/http'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { LucidRow } from '@adonisjs/lucid/types/model'
import checkout from '#config/checkout'
import type User from '#models/account/user'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import Collection from '#models/catalog/collection'
import ProductReview from '#models/catalog/product_review'
import Order from '#models/checkout/order'
import Shipment from '#models/checkout/shipment'
import DiscountCode from '#models/checkout/discount_code'
import BlogPost, { blogPostStatuses } from '#models/content/blog_post'
import { toMajor } from '#models/shared/money'
import { reviewAuthorName } from '#services/catalog/review_service'
import type FulfillmentService from '#services/checkout/fulfillment_service'
import type SellerOrderService from '#services/seller/order_service'
import type SellerVariantService from '#services/seller/variant_service'
import type SellerCatalogueService from '#services/seller/catalogue_service'
import type SellerDiscountService from '#services/seller/discount_service'
import type SellerReviewService from '#services/seller/review_service'
import type SellerPostService from '#services/seller/post_service'
import type RichTextService from '#services/content/rich_text_service'
import { variantUpdateValidator } from '#validators/seller/variant'
import { stockAdjustmentValidator } from '#validators/seller/stock_adjustment'
import { productUpdateValidator } from '#validators/seller/product'
import { collectionCreateValidator, collectionUpdateValidator } from '#validators/seller/collection'
import { shipmentValidator } from '#validators/checkout/fulfillment'
import { orderUpdateValidator } from '#validators/seller/order'
import { discountValidator } from '#validators/seller/discount'
import { reviewModerationValidator } from '#validators/seller/review'
import { postValidator } from '#validators/seller/post'
import type { CopilotAction, CopilotRecordType } from '#values/assistant'
import type { WriteOptions } from '../../types/write_options.js'

/** The dashboard services a proposal is applied through. */
export type CopilotActionServices = {
  fulfillment: FulfillmentService
  orders: SellerOrderService
  variants: SellerVariantService
  catalogue: SellerCatalogueService
  discounts: SellerDiscountService
  reviews: SellerReviewService
  posts: SellerPostService
  richText: RichTextService
}

/** How a changed field is labelled and its raw value shown, before → after. */
export type CopilotField = { label: string; format: (value: unknown) => string }

type Values = Record<string, unknown>

type ApplyContext = {
  actor: User
  services: CopilotActionServices
  options: WriteOptions
}

/**
 * One kind of change the copilot may propose. `read` gives the record's current raw values for
 * the stale check; `validate` merges the new values over them and runs the dashboard's own
 * validator; `apply` calls the same service method the dashboard does.
 */
export type CopilotActionDefinition<Row extends LucidRow = LucidRow> = {
  recordType: CopilotRecordType
  /** Creates a new record instead of changing one; its item has no record id. */
  creates: boolean
  /** Whether applying it sends the customer an email, as the dashboard's action does. */
  emailsCustomer: boolean
  fields: Record<string, CopilotField>
  /** The canonical new values, e.g. a shipment also moving to "shipped". */
  normalize?: (changes: Values) => Values
  find: (id: string, client?: TransactionClientContract) => Promise<Row | null>
  blank: () => Row | null
  ability: (bouncer: HttpContext['bouncer'], row: Row | null) => Promise<boolean>
  label: (row: Row | null, after: Values) => string
  read: (row: Row, client?: TransactionClientContract) => Promise<Values>
  validate: (row: Row | null, values: Values, richText: RichTextService) => Promise<unknown>
  apply: (row: Row | null, payload: unknown, context: ApplyContext) => Promise<unknown>
}

const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: checkout.currency })

const text = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  const shown = String(value)
  return shown.length > 120 ? `${shown.slice(0, 119)}…` : shown
}
const money = (value: unknown) =>
  value === null || value === undefined || value === '' ? '—' : currency.format(Number(value))
const yesNo = (value: unknown) => (value ? 'Yes' : 'No')
const labelled = (labels: Record<string, string>) => (value: unknown) =>
  labels[String(value)] ?? text(value)
const count = (noun: string) => (value: unknown) => {
  const total = Array.isArray(value) ? value.length : 0
  return `${total} ${noun}${total === 1 ? '' : 's'}`
}

const productStatuses = { draft: 'Draft', active: 'Active', archived: 'Archived' }
const shipmentStates = {
  pending: 'Not packed',
  packing: 'Packing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** Lets the dashboard validators skip the record itself in their uniqueness checks. */
const meta = (row: LucidRow | null) => ({ meta: { id: (row as { id?: string } | null)?.id } })

function define<Row extends LucidRow>(definition: CopilotActionDefinition<Row>) {
  return definition as unknown as CopilotActionDefinition
}

/* -------------------------------------------------------------------------------------------- */
/* Catalog                                                                                     */
/* -------------------------------------------------------------------------------------------- */

const productFields = {
  title: { label: 'Title', format: text },
  handle: { label: 'Handle', format: text },
  description: { label: 'Description', format: text },
  vendor: { label: 'Vendor', format: text },
  productType: { label: 'Product type', format: text },
  status: { label: 'Status', format: labelled(productStatuses) },
}

const productUpdate = define<Product>({
  recordType: 'product',
  creates: false,
  emailsCustomer: false,
  fields: productFields,
  find: (id, client) => Product.find(id, { client }),
  blank: () => null,
  ability: (bouncer, row) => bouncer.with('SellerProductPolicy').allows('update', row!),
  label: (row) => row!.title,
  read: async (row) => ({
    title: row.title,
    handle: row.handle,
    description: row.description,
    vendor: row.vendor,
    productType: row.productType,
    status: row.status,
  }),
  validate: (row, values) => productUpdateValidator.validate(values, meta(row)),
  apply: (row, payload, { services, options }) =>
    services.catalogue.saveProduct(
      row!,
      payload as Awaited<ReturnType<typeof productUpdateValidator.validate>>,
      options
    ),
})

/** A variant is shown by its product, and by its own title unless it is the only "Default". */
const variantLabel = (variant: ProductVariant) =>
  variant.title && variant.title !== 'Default'
    ? `${variant.product.title} — ${variant.title}`
    : variant.product.title

const findVariant = (id: string, client?: TransactionClientContract) =>
  ProductVariant.query({ client }).where('id', id).preload('product').first()

const variantUpdate = define<ProductVariant>({
  recordType: 'variant',
  creates: false,
  emailsCustomer: false,
  fields: {
    title: { label: 'Title', format: text },
    sku: { label: 'SKU', format: text },
    price: { label: 'Price', format: money },
    compareAtPrice: { label: 'Compare-at price', format: money },
    availableForSale: { label: 'Available for sale', format: yesNo },
  },
  find: findVariant,
  blank: () => null,
  ability: (bouncer, row) =>
    bouncer.with('SellerVariantPolicy').allows('update', row!, row!.product),
  label: (row) => variantLabel(row!),
  read: async (row) => ({
    title: row.title,
    sku: row.sku,
    price: Number(row.priceAmount),
    compareAtPrice: row.compareAtPriceAmount === null ? null : Number(row.compareAtPriceAmount),
    availableForSale: Boolean(row.availableForSale),
  }),
  validate: (row, values) =>
    variantUpdateValidator.validate(
      {
        title: values.title,
        sku: values.sku,
        priceAmount: values.price,
        compareAtPriceAmount: values.compareAtPrice,
        currencyCode: row!.currencyCode,
        inventoryQuantity: row!.inventoryQuantity,
        availableForSale: values.availableForSale,
        options: Object.entries(row!.safeOptions ?? {}).map(([name, value]) => ({ name, value })),
      },
      meta(row)
    ),
  apply: (row, payload, { actor, services, options }) =>
    services.variants.saveVariant(
      row!.product,
      row!,
      payload as Awaited<ReturnType<typeof variantUpdateValidator.validate>>,
      actor.id,
      options
    ),
})

const stockAdjust = define<ProductVariant>({
  recordType: 'variant',
  creates: false,
  emailsCustomer: false,
  fields: { stock: { label: 'Stock on hand', format: text } },
  find: findVariant,
  blank: () => null,
  ability: (bouncer, row) =>
    bouncer.with('SellerVariantPolicy').allows('adjustStock', row!, row!.product),
  label: (row) => variantLabel(row!),
  read: async (row) => ({ stock: row.inventoryQuantity }),
  validate: (_row, values) =>
    stockAdjustmentValidator.validate({
      mode: 'set',
      quantity: values.stock,
      reason: 'correction',
    }),
  apply: (row, payload, { actor, services, options }) =>
    services.variants.adjustStock(
      row!.product,
      row!,
      payload as Awaited<ReturnType<typeof stockAdjustmentValidator.validate>>,
      actor.id,
      options
    ),
})

const collectionFields = {
  title: { label: 'Title', format: text },
  handle: { label: 'Handle', format: text },
  description: { label: 'Description', format: text },
  published: { label: 'Published', format: yesNo },
  productIds: { label: 'Products', format: count('product') },
}

const readCollection = async (row: Collection, client?: TransactionClientContract) => {
  const products = await row
    .related('products')
    .query()
    .if(client, (query) => query.useTransaction(client!))
    .orderBy('collection_products.position')
  return {
    title: row.title,
    handle: row.handle,
    description: row.description,
    published: row.publishedAt !== null,
    productIds: products.map((product) => product.id),
  }
}

const collectionCreate = define<Collection>({
  recordType: 'collection',
  creates: true,
  emailsCustomer: false,
  fields: collectionFields,
  find: async () => null,
  blank: () => new Collection(),
  ability: (bouncer) => bouncer.with('SellerCollectionPolicy').allows('create'),
  label: (_row, after) => text(after.title),
  read: readCollection,
  validate: (_row, values) =>
    collectionCreateValidator.validate({
      description: null,
      published: false,
      productIds: [],
      ...values,
    }),
  apply: (row, payload, { services, options }) =>
    services.catalogue.saveCollection(
      row!,
      payload as Awaited<ReturnType<typeof collectionCreateValidator.validate>>,
      options
    ),
})

const collectionUpdate = define<Collection>({
  recordType: 'collection',
  creates: false,
  emailsCustomer: false,
  fields: collectionFields,
  find: (id, client) => Collection.find(id, { client }),
  blank: () => null,
  ability: (bouncer, row) => bouncer.with('SellerCollectionPolicy').allows('update', row!),
  label: (row) => row!.title,
  read: readCollection,
  validate: (row, values) => collectionUpdateValidator.validate(values, meta(row)),
  apply: (row, payload, { services, options }) =>
    services.catalogue.saveCollection(
      row!,
      payload as Awaited<ReturnType<typeof collectionUpdateValidator.validate>>,
      options
    ),
})

/* -------------------------------------------------------------------------------------------- */
/* Orders                                                                                      */
/* -------------------------------------------------------------------------------------------- */

const shipmentFields = {
  shipmentState: { label: 'Shipment', format: labelled(shipmentStates) },
  carrier: { label: 'Carrier', format: text },
  trackingNumber: { label: 'Tracking number', format: text },
  trackingUrl: { label: 'Tracking link', format: text },
}

const readShipment = async (row: Order, client?: TransactionClientContract) => {
  const shipment = await Shipment.query({ client }).where('order_id', row.id).first()
  return {
    shipmentState: shipment?.state ?? null,
    carrier: shipment?.carrier ?? null,
    trackingNumber: shipment?.trackingNumber ?? null,
    trackingUrl: shipment?.trackingUrl ?? null,
  }
}

const orderBase = {
  recordType: 'order' as const,
  creates: false,
  find: (id: string, client?: TransactionClientContract) => Order.find(id, { client }),
  blank: () => null,
  ability: (bouncer: HttpContext['bouncer'], row: Order | null) =>
    bouncer.with('SellerOrderPolicy').allows('update', row!),
  label: (row: Order | null) => `Order ${row!.number}`,
}

const orderPack = define<Order>({
  ...orderBase,
  emailsCustomer: false,
  fields: shipmentFields,
  normalize: () => ({ shipmentState: 'packing' }),
  read: readShipment,
  validate: async () => null,
  apply: (row, _payload, { actor, services, options }) =>
    services.fulfillment.pack(row!.id, actor, options),
})

const orderShip = define<Order>({
  ...orderBase,
  emailsCustomer: true,
  fields: shipmentFields,
  normalize: ({ carrier, trackingNumber, trackingUrl }) => ({
    shipmentState: 'shipped',
    carrier,
    trackingNumber,
    ...(trackingUrl ? { trackingUrl } : {}),
  }),
  read: readShipment,
  validate: (_row, { carrier, trackingNumber, trackingUrl }) =>
    shipmentValidator.validate({ carrier, trackingNumber, trackingUrl: trackingUrl ?? undefined }),
  apply: (row, payload, { actor, services, options }) =>
    services.fulfillment.ship(
      row!.id,
      actor,
      payload as Awaited<ReturnType<typeof shipmentValidator.validate>>,
      options
    ),
})

const orderDeliver = define<Order>({
  ...orderBase,
  emailsCustomer: true,
  fields: shipmentFields,
  normalize: () => ({ shipmentState: 'delivered' }),
  read: readShipment,
  validate: async () => null,
  apply: (row, _payload, { actor, services, options }) =>
    services.fulfillment.deliver(row!.id, actor, options),
})

const orderNote = define<Order>({
  ...orderBase,
  emailsCustomer: false,
  fields: { note: { label: 'Note', format: text } },
  read: async (row) => ({ note: row.note }),
  validate: (row, values) =>
    orderUpdateValidator.validate({
      financialStatus: row!.financialStatus,
      fulfillmentStatus: row!.fulfillmentStatus,
      note: values.note,
    }),
  apply: (row, payload, { services, options }) =>
    services.orders.update(
      row!,
      payload as Awaited<ReturnType<typeof orderUpdateValidator.validate>>,
      options
    ),
})

/* -------------------------------------------------------------------------------------------- */
/* Discounts, reviews, posts                                                                   */
/* -------------------------------------------------------------------------------------------- */

const discountFields = {
  code: { label: 'Code', format: text },
  description: { label: 'Description', format: text },
  kind: { label: 'Type', format: labelled({ percentage: 'Percentage', fixed: 'Fixed amount' }) },
  percentOff: { label: 'Percent off', format: (value: unknown) => (value ? `${value}%` : '—') },
  amountOff: { label: 'Amount off', format: money },
  minimumSubtotal: { label: 'Minimum subtotal', format: money },
  usageLimit: { label: 'Usage limit', format: text },
  oncePerCustomer: { label: 'Once per customer', format: yesNo },
  active: { label: 'Active', format: yesNo },
  startsAt: { label: 'Starts', format: text },
  endsAt: { label: 'Ends', format: text },
}

const readDiscount = async (row: DiscountCode) => ({
  code: row.code,
  description: row.description,
  kind: row.kind,
  percentOff: row.percentOff,
  amountOff: row.amountOffMinor === null ? null : toMajor(row.amountOffMinor),
  minimumSubtotal: toMajor(row.minimumSubtotalMinor),
  usageLimit: row.usageLimit,
  oncePerCustomer: Boolean(row.oncePerCustomer),
  active: Boolean(row.active),
  startsAt: row.startsAt?.toISO() ?? null,
  endsAt: row.endsAt?.toISO() ?? null,
})

const applyDiscount = (
  row: DiscountCode | null,
  payload: unknown,
  { actor, services, options }: ApplyContext
) =>
  services.discounts.save(
    row!,
    payload as Awaited<ReturnType<typeof discountValidator.validate>>,
    actor.id,
    options
  )

const discountCreate = define<DiscountCode>({
  recordType: 'discount',
  creates: true,
  emailsCustomer: false,
  fields: discountFields,
  find: async () => null,
  blank: () => new DiscountCode(),
  ability: (bouncer) => bouncer.with('SellerDiscountPolicy').allows('create'),
  label: (_row, after) => text(after.code),
  read: readDiscount,
  validate: (_row, values) =>
    discountValidator.validate({
      description: null,
      minimumSubtotal: 0,
      usageLimit: null,
      oncePerCustomer: false,
      active: true,
      startsAt: null,
      endsAt: null,
      ...values,
    }),
  apply: applyDiscount,
})

const discountUpdate = define<DiscountCode>({
  recordType: 'discount',
  creates: false,
  emailsCustomer: false,
  fields: discountFields,
  find: (id, client) => DiscountCode.find(id, { client }),
  blank: () => null,
  ability: (bouncer, row) => bouncer.with('SellerDiscountPolicy').allows('update', row!),
  label: (row) => row!.code,
  read: readDiscount,
  validate: (row, values) => discountValidator.validate(values, meta(row)),
  apply: applyDiscount,
})

const reviewModerate = define<ProductReview>({
  recordType: 'review',
  creates: false,
  emailsCustomer: false,
  fields: {
    status: {
      label: 'Status',
      format: labelled({ pending: 'Pending', approved: 'Approved', hidden: 'Hidden' }),
    },
  },
  find: (id, client) =>
    ProductReview.query({ client }).where('id', id).preload('product').preload('user').first(),
  blank: () => null,
  ability: (bouncer, row) => bouncer.with('SellerReviewPolicy').allows('update', row!),
  label: (row) => `${reviewAuthorName(row!.user)}'s review of ${row!.product.title}`,
  read: async (row) => ({ status: row.status }),
  validate: (_row, values) => reviewModerationValidator.validate(values),
  apply: (row, payload, { actor, services, options }) =>
    services.reviews.moderate(
      row!,
      (payload as Awaited<ReturnType<typeof reviewModerationValidator.validate>>).status,
      actor,
      options
    ),
})

const postFields = {
  title: { label: 'Title', format: text },
  handle: { label: 'Handle', format: text },
  excerpt: { label: 'Excerpt', format: text },
  badge: { label: 'Badge', format: text },
  body: { label: 'Text', format: text },
  status: {
    label: 'Status',
    format: labelled(
      Object.fromEntries(blogPostStatuses.map((s) => [s, s[0].toUpperCase() + s.slice(1)]))
    ),
  },
}

/** The copilot writes plain text; the editor's document holds one paragraph per block. */
const documentFrom = (body: string, richText: RichTextService) =>
  richText.normalize({
    type: 'doc',
    content: body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => ({ type: 'paragraph', content: [{ type: 'text', text: paragraph }] })),
  })

const validatePost = (row: BlogPost | null, values: Values, richText: RichTextService) =>
  postValidator.validate(
    {
      title: values.title,
      handle: values.handle,
      excerpt: values.excerpt ?? null,
      badge: values.badge ?? null,
      content: JSON.stringify(documentFrom(String(values.body ?? ''), richText)),
      status: values.status ?? 'draft',
      publishedAt: row?.publishedAt?.toISO() ?? null,
    },
    meta(row)
  )

const postCreate = define<BlogPost>({
  recordType: 'post',
  creates: true,
  emailsCustomer: false,
  fields: postFields,
  find: async () => null,
  blank: () => new BlogPost(),
  ability: (bouncer) => bouncer.with('SellerPostPolicy').allows('create'),
  label: (_row, after) => text(after.title),
  read: async () => ({}),
  validate: validatePost,
  apply: (row, payload, { actor, services, options }) =>
    services.posts.save(
      row!,
      payload as Awaited<ReturnType<typeof postValidator.validate>>,
      actor.id,
      options
    ),
})

/** Kept so `read` can compare text without the services; same walk as RichTextService.toText. */
const postText = (node: { text?: string; content?: unknown[] }): string =>
  node.text ?? (node.content ?? []).map((child) => postText(child as typeof node)).join('\n\n')

const postUpdate = define<BlogPost>({
  recordType: 'post',
  creates: false,
  emailsCustomer: false,
  fields: postFields,
  find: (id, client) => BlogPost.find(id, { client }),
  blank: () => null,
  ability: (bouncer, row) => bouncer.with('SellerPostPolicy').allows('update', row!),
  label: (row) => row!.title,
  read: async (row) => ({
    title: row.title,
    handle: row.handle,
    excerpt: row.excerpt,
    badge: row.badge,
    body: postText(row.content),
    status: row.status,
  }),
  validate: validatePost,
  apply: (row, payload, { actor, services, options }) =>
    services.posts.save(
      row!,
      payload as Awaited<ReturnType<typeof postValidator.validate>>,
      actor.id,
      options
    ),
})

/** Every change the copilot may propose, keyed by action. */
export const copilotActionRegistry: Record<CopilotAction, CopilotActionDefinition> = {
  product_update: productUpdate,
  variant_update: variantUpdate,
  stock_adjust: stockAdjust,
  collection_create: collectionCreate,
  collection_update: collectionUpdate,
  order_pack: orderPack,
  order_ship: orderShip,
  order_deliver: orderDeliver,
  order_note: orderNote,
  discount_create: discountCreate,
  discount_update: discountUpdate,
  review_moderate: reviewModerate,
  post_create: postCreate,
  post_update: postUpdate,
}

/** Labels and formatting for every field any action changes, for showing before → after. */
export function copilotField(action: CopilotAction, field: string): CopilotField {
  return copilotActionRegistry[action].fields[field] ?? { label: field, format: text }
}

/** Whether two raw values are the same, treating 1200 and "1200.0000" alike. */
export function sameValue(a: unknown, b: unknown) {
  const empty = (value: unknown) => value === null || value === undefined || value === ''
  if (empty(a) || empty(b)) return empty(a) && empty(b)
  const numeric = (value: unknown) =>
    typeof value === 'number' || (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value))
  if (numeric(a) && numeric(b)) return Number(a) === Number(b)
  return JSON.stringify(a) === JSON.stringify(b)
}
