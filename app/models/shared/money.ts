/** Reads a stored centavo column; SQLite may return integers as bigint or null. */
export function toMinor(value: unknown): number {
  return value === null || value === undefined ? 0 : Number(value)
}

/** Peso value of a centavo amount, for display and decimal-based API fields. */
export function toMajor(minor: number | null | undefined): number {
  return (minor ?? 0) / 100
}
