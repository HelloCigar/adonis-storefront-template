/** Lucid model writes wrap the count; database query writes return the scalar count. */
export function affectedRows(result: unknown): number {
  if (typeof result === 'number') return result
  if (Array.isArray(result) && typeof result[0] === 'number') return result[0]
  throw new Error('Unsupported database mutation result')
}
