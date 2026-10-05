import { DateTime } from 'luxon'
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
    const current = this.window(start, until)
    const previous = this.window(start.minus(until.diff(start)), start)
    const periods = this.periods(until.diff(start, 'days').days)
    const period = query.period && periods.includes(query.period) ? query.period : periods[0]

    const [now, before, customersNow, customersBefore, chart, recentOrders] = await Promise.all([
      this.sales(current),
      this.sales(previous),
      this.newCustomers(current),
      this.newCustomers(previous),
      this.chart(start, until, period),
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
      .sum('total_amount as total')
      .first()
    return { count: Number(row?.count ?? 0), total: Number(row?.total ?? 0) }
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

  private async chart(start: DateTime, until: DateTime, period: DashboardPeriod) {
    const unit = bucketUnits[period]
    const buckets = new Map<string, number>()
    for (let cursor = start.startOf(unit); cursor < until; cursor = cursor.plus({ [unit]: 1 })) {
      buckets.set(cursor.toISODate()!, 0)
    }
    const { from, until: to } = this.window(start, until)
    const rows: { processed_at: string; total_amount: number }[] = await db
      .from('orders')
      .select('processed_at', 'total_amount')
      .whereIn('financial_status', capturedStatuses)
      .where('processed_at', '>=', from)
      .where('processed_at', '<', to)
    for (const row of rows) {
      const key = DateTime.fromSQL(row.processed_at, { zone: 'utc' })
        .setZone(storeZone)
        .startOf(unit)
        .toISODate()!
      buckets.set(key, (buckets.get(key) ?? 0) + Number(row.total_amount))
    }
    return [...buckets].map(([date, amount]) => ({ date, amount }))
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
      totalAmount: Number(order.totalAmount),
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
