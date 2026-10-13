import { type CheckoutSession } from '#middleware/checkout/checkout_session_middleware'

/** An in-memory session store, with its raw values exposed for assertions. */
export function memorySession() {
  const values: Record<string, unknown> = {}
  return {
    values,
    store: {
      get: (key: string) => values[key],
      put: (key: string, value: unknown) => {
        values[key] = value
      },
    } as ConstructorParameters<typeof CheckoutSession>[0],
  }
}
