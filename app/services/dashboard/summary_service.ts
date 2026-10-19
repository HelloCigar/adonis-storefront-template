import { DateTime, type Duration } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/checkout/order'
import checkout from '#config/checkout'

export const dashboardPeriods = ['daily', 'weekly', 'monthly'] as const
export type DashboardPeriod = (typeof dashboardPeriods)[number]

/** Captured orders, including later refunds, count toward gross sales. */
const capturedStatuses = ['paid', 'partially_refunded', 'refunded']
const bucketUnits = { daily: 'day', weekly: 'week', monthly: 'month' } as const
const defaultDays = 14
const maxDays = 400
const sqlFormat = 'yyyy-MM-dd HH:mm:ss'
/** Matches the order screens, which present times in the store's local zone. */
const storeZone = 'Asia/Manila'

interface Window {
  from: string
  until: string
}

/**
 * Store figures for the management dashboard. Calendar days follow the store's zone;
 * stored timestamps are UTC.
 */
export default class SummaryService {
  async summarize(query: { start?: string; end?: string; period?: DashboardPeriod }) {
    const today = DateTime.now().setZone(storeZone).startOf('day')
    let end = this.parseDay(query.end) ?? today
    let start = this.parseDay(query.start) ?? end.minus({ days: defaultDays })
    if (start > end) [start, end] = [end, start]
    if (end.diff(start, 'days').days > maxDays) start = end.minus({ days: maxDays })

    const until = end.plus({ days: 1 })
    const length = until.diff(start)
    const current = this.window(start, until)
    const previous = this.window(start.minus(length), start)
    const periods = this.periods(until.diff(start, 'days').days)
    const period = query.period && periods.includes(query.period) ? query.period : periods[0]

    const [now, before, customersNow, customersBefore, chart, recentOrders] = await Promise.all([
      this.sales(current),
      this.sales(previous),
      this.newCustomers(current),
      this.newCustomers(previous),
      this.chart(start, until, length, period),
      this.recentOrders(current),
    ])
    const average = (sales: { count: number; total: number }) =>
      sales.count ? sales.total / sales.count : 0

    return {
      query: { start: start.toISODate()!, end: end.toISODate()!, period, periods },
      currency: checkout.currency,
      stats: {
        grossSales: { value: now.total, change: this.change(now.total, before.total) },
        paidOrders: { value: now.count, change: this.change(now.count, before.count) },
        averageOrder: { value: average(now), change: this.change(average(now), average(before)) },
        newCustomers: { value: customersNow, change: this.change(customersNow, customersBefore) },
      },
      chart,
      recentOrders,
    }
  }

  private async sales({ from, until }: Window) {
    const row = await db
      .from('orders')
      .whereIn('financial_status', capturedStatuses)
      .where('processed_at', '>=', from)
      .where('processed_at', '<', until)
      .count('* as count')
      .sum('total_minor as total')
      .first()
    return { count: Number(row?.count ?? 0), total: Number(row?.total ?? 0) / 100 }
  }

  private async newCustomers({ from, until }: Window) {
    const row = await db
      .from('users')
      .where('role', 'customer')
      .where('created_at', '>=', from)
      .where('created_at', '<', until)
      .count('* as count')
      .first()
    return Number(row?.count ?? 0)
  }

  /**
   * Buckets the range's captured sales, with each bucket's `previous` holding sales from one
   * range-length earlier. Earlier orders shift forward by that length before bucketing, so
   * weekly and monthly buckets line up with the range rather than the earlier calendar.
   * `orders` and `customers` count the range's captured orders and customer sign-ups.
   */
  private async chart(start: DateTime, until: DateTime, length: Duration, period: DashboardPeriod) {
    const unit = bucketUnits[period]
    const empty = () => ({ amount: 0, previous: 0, orders: 0, customers: 0 })
    const buckets = new Map<string, ReturnType<typeof empty>>()
    for (let cursor = start.startOf(unit); cursor < until; cursor = cursor.plus({ [unit]: 1 })) {
      buckets.set(cursor.toISODate()!, empty())
    }
    const bucketFor = (at: DateTime) => {
      const key = at.startOf(unit).toISODate()!
      if (!buckets.has(key)) buckets.set(key, empty())
      return buckets.get(key)!
    }
    const storeTime = (value: string) => DateTime.fromSQL(value, { zone: 'utc' }).setZone(storeZone)

    const { from, until: to } = this.window(start.minus(length), until)
    const current = this.window(start, until)
    const [orders, customers]: [
      { processed_at: string; total_minor: number }[],
      { created_at: string }[],
    ] = await Promise.all([
      db
        .from('orders')
        .select('processed_at', 'total_minor')
        .whereIn('financial_status', capturedStatuses)
        .where('processed_at', '>=', from)
        .where('processed_at', '<', to),
      db
        .from('users')
        .select('created_at')
        .where('role', 'customer')
        .where('created_at', '>=', current.from)
        .where('created_at', '<', current.until),
    ])
    for (const row of orders) {
      const processedAt = storeTime(row.processed_at)
      const amount = Number(row.total_minor) / 100
      if (processedAt < start) {
        bucketFor(processedAt.plus(length)).previous += amount
      } else {
        const bucket = bucketFor(processedAt)
        bucket.amount += amount
        bucket.orders += 1
      }
    }
    for (const row of customers) bucketFor(storeTime(row.created_at)).customers += 1
    return [...buckets].map(([date, bucket]) => ({ date, ...bucket }))
  }

  private async recentOrders({ from, until }: Window) {
    const orders = await Order.query()
      .where('processed_at', '>=', from)
      .where('processed_at', '<', until)
      .orderBy('processed_at', 'desc')
      .orderBy('id', 'desc')
      .limit(5)
    return orders.map((order) => ({
      id: order.id,
      number: order.number,
      email: order.email,
      financialStatus: order.financialStatus,
      totalAmount: order.totalAmount,
      currencyCode: order.currencyCode,
      processedAt: order.processedAt.toISO()!,
    }))
  }

  /** Mirrors the bucket sizes the date controls offer for a range of this many days. */
  private periods(days: number): DashboardPeriod[] {
    if (days <= 8) return ['daily']
    if (days <= 31) return ['daily', 'weekly']
    return ['weekly', 'monthly']
  }

  /** Whole-percent change from the previous window; null when there is no baseline. */
  private change(current: number, previous: number) {
    if (!previous) return null
    return Math.round(((current - previous) / previous) * 100)
  }

  private window(from: DateTime, until: DateTime): Window {
    return { from: from.toUTC().toFormat(sqlFormat), until: until.toUTC().toFormat(sqlFormat) }
  }

  private parseDay(value?: string) {
    if (!value) return null
    const day = DateTime.fromISO(value, { zone: storeZone })
    return day.isValid ? day.startOf('day') : null
  }
}
