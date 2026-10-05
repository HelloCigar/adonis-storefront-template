import { createHash } from 'node:crypto'
import { errors } from '@vinejs/vine'

export type OptionDefinition = { name: string; values: string[] }
export type OptionIssue = {
  variantId: number | null
  kind: 'configuration' | 'invalid' | 'duplicate'
  message: string
}

export const variantGenerationLimit = 100

export function optionCombinationKey(options: unknown): string | null {
  const entries = optionEntries(options)
  if (!entries) return null
  return createHash('sha256')
    .update(
      JSON.stringify(entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)))
    )
    .digest('hex')
}

/** Keep malformed legacy data out of frontend option records without accepting it as a default. */
export function safeOptionRecord(options: unknown): Record<string, string> | null {
  const entries = optionEntries(options)
  return entries === null ? null : Object.fromEntries(entries)
}

export function hasInvalidOptionData(options: unknown): boolean {
  return optionEntries(options) === null
}

function optionEntries(options: unknown): [string, string][] | null {
  if (options === null || options === undefined) return []
  if (typeof options !== 'object' || Array.isArray(options)) return null
  const entries = Object.entries(options)
  if (entries.some(([name, value]) => !name.trim() || typeof value !== 'string' || !value.trim()))
    return null
  return entries as [string, string][]
}

export default class OptionsService {
  validateDefinitions(definitions: OptionDefinition[]) {
    if (definitions.length > 3) this.fail('optionDefinitions', 'Use up to three product options.')
    const names = definitions.map((definition) => definition.name.toLowerCase())
    if (new Set(names).size !== names.length)
      this.fail('optionDefinitions', 'Option names must be unique.')
    for (const [index, definition] of definitions.entries()) {
      if (!definition.values.length)
        this.fail(`optionDefinitions.${index}.values`, 'Add at least one value for this option.')
      const values = definition.values.map((value) => value.toLowerCase())
      if (new Set(values).size !== values.length)
        this.fail(`optionDefinitions.${index}.values`, 'Option values must be unique.')
    }
  }

  matches(definitions: OptionDefinition[], options: unknown) {
    const entries = optionEntries(options)
    return (
      definitions.length <= 3 &&
      entries !== null &&
      entries.length === definitions.length &&
      definitions.every((definition) =>
        entries.some(
          ([name, value]) => name === definition.name && definition.values.includes(value)
        )
      )
    )
  }

  validateCombination(
    definitions: OptionDefinition[],
    options: Record<string, string>,
    allowLegacyRepair = false
  ) {
    const entries = optionEntries(options)
    const legacyRepair =
      allowLegacyRepair &&
      definitions.length > 3 &&
      entries !== null &&
      entries.length <= 3 &&
      entries.every(([name, value]) =>
        definitions.some(
          (definition) => definition.name === name && definition.values.includes(value)
        )
      )
    if (!this.matches(definitions, options) && !legacyRepair)
      this.fail(
        'options',
        'Select one allowed value for every product option. Configure product options first.'
      )
    return optionCombinationKey(options)!
  }

  issues(
    definitions: OptionDefinition[],
    variants: { id: number; options: unknown }[]
  ): OptionIssue[] {
    const issues: OptionIssue[] = []
    try {
      this.validateDefinitions(definitions)
    } catch {
      issues.push({
        variantId: null,
        kind: 'configuration',
        message:
          'Legacy product options need repair: use up to three dimensions with unique names and values.',
      })
    }
    const seen = new Map<string, number>()
    for (const variant of variants) {
      if (!this.matches(definitions, variant.options))
        issues.push({
          variantId: variant.id,
          kind: 'invalid',
          message: 'Select one allowed value for every configured product option.',
        })
      const key = optionCombinationKey(variant.options)
      if (key && seen.has(key))
        issues.push({
          variantId: variant.id,
          kind: 'duplicate',
          message: `This combination is also used by variant #${seen.get(key)}. Choose a different combination.`,
        })
      if (key) seen.set(key, seen.get(key) ?? variant.id)
    }
    return issues
  }

  combinations(definitions: OptionDefinition[]) {
    this.validateDefinitions(definitions)
    const count = definitions.reduce((total, definition) => total * definition.values.length, 1)
    if (count > variantGenerationLimit)
      this.fail(
        'optionDefinitions',
        `Generation supports at most ${variantGenerationLimit} combinations. Reduce option values first.`
      )
    return definitions.reduce<Record<string, string>[]>(
      (combinations, definition) =>
        combinations.flatMap((combination) =>
          definition.values.map((value) => ({ ...combination, [definition.name]: value }))
        ),
      [{}]
    )
  }

  fail(field: string, message: string): never {
    throw new errors.E_VALIDATION_ERROR([{ field, rule: 'options', message }])
  }
}
