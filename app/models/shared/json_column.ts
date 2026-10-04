export const jsonColumn = {
  prepare: (value: unknown) => (value === null ? null : JSON.stringify(value)),
  consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
}
