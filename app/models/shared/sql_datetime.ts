import { DateTime } from 'luxon'

/**
 * A UTC timestamp formatted like stored datetime columns. Query-builder updates and
 * comparisons need it; model saves format DateTime columns themselves.
 */
export function sqlDateTime(at: DateTime = DateTime.utc()) {
  return at.toUTC().toSQL({ includeOffset: false })!
}
