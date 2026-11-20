import { InvalidParametersError } from '@libp2p/interface'
import { isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import { custom, getDotPath, minValue, number, optional, pipe, safeParse } from 'valibot'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { GenericSchema, InferOutput } from 'valibot'

/**
 * A valibot schema that accepts a Multiaddr instance, or a string that parses
 * as one
 */
export const multiaddrInput = custom<Multiaddr | string>((value) => {
  if (isMultiaddr(value)) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  try {
    multiaddr(value)
    return true
  } catch {
    return false
  }
}, (issue) => `is not a valid multiaddr: ${String(issue.input)}`)

/**
 * A valibot schema for an optional number that is greater than or equal to 0
 */
export const nonNegativeNumber = optional(pipe(number(), minValue(0, 'must be greater than or equal to 0')))

/**
 * Validate a config object against a valibot schema, throwing an
 * `InvalidParametersError` that names the first invalid option, e.g.
 * `Invalid addresses config: listen.0 is not a valid multiaddr: foo`
 */
export function validateOptions <Schema extends GenericSchema> (schema: Schema, value: unknown, name: string): InferOutput<Schema> {
  const result = safeParse(schema, value)

  if (!result.success) {
    const issue = result.issues[0]
    throw new InvalidParametersError(`Invalid ${name} config: ${getDotPath(issue) ?? 'options'} ${issue.message}`)
  }

  return result.output
}
