/** The four policies admins write in store setup and store settings. */
export const storePolicyHandles = [
  'refund-policy',
  'shipping-policy',
  'privacy-policy',
  'terms-of-service',
] as const

export type StorePolicyHandle = (typeof storePolicyHandles)[number]

export const storePolicyTitles: Record<StorePolicyHandle, string> = {
  'refund-policy': 'Refund policy',
  'shipping-policy': 'Shipping policy',
  'privacy-policy': 'Privacy policy',
  'terms-of-service': 'Terms of service',
}
