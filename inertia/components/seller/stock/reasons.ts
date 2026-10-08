export const stockReasonLabels: Record<string, string> = {
  received: 'Received',
  returned: 'Customer return',
  count: 'Stock count',
  damaged: 'Damaged',
  lost: 'Lost or stolen',
  correction: 'Correction',
  initial: 'Variant created',
  edited: 'Variant edited',
}

export const stockReasonLabel = (reason: string) => stockReasonLabels[reason] ?? reason
