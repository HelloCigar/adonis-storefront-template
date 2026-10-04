import CheckoutException from '#exceptions/checkout_exception'

/** Exact conversion at the existing decimal catalogue boundary. Domain amounts are centavos. */
export default class MoneyService {
  toMinor(value: string | number): number {
    const decimal = String(value)
    if (!/^\d+(?:\.\d{1,2})?$/.test(decimal)) this.invalid()
    const [whole, fraction = ''] = decimal.split('.')
    const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) this.invalid()
    return Number(minor)
  }

  toMajor(value: number): string {
    this.assertMinor(value)
    return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`
  }

  add(...values: number[]): number {
    let result = 0
    for (const value of values) {
      this.assertMinor(value)
      result += value
      this.assertMinor(result)
    }
    return result
  }

  multiply(amount: number, quantity: number): number {
    this.assertMinor(amount)
    if (!Number.isSafeInteger(quantity) || quantity < 1) this.invalid()
    const result = amount * quantity
    this.assertMinor(result)
    return result
  }

  assertMinor(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) this.invalid()
  }

  private invalid(): never {
    throw new CheckoutException('Invalid money amount or precision', 'E_CHECKOUT_MONEY', 422)
  }
}
