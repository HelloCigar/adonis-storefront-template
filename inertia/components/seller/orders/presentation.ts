export const orderLabel = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replaceAll('.', ' ')
    .replace(/^./, (letter) => letter.toUpperCase())

export function orderMoney(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return 'Amount unavailable'
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount)
  } catch {
    return `${new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2 }).format(amount)} ${currency}`
  }
}

export function orderDate(value: string | null | undefined) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date)
}

export function operationMessage(value: string, kind: 'payment' | 'refund' | 'notification') {
  if (!value.startsWith('E_')) return value
  if (kind === 'notification')
    return 'Email delivery could not be confirmed. Retry after checking the mail service.'
  return 'The provider outcome needs verification. Reconcile using the original provider reference.'
}
