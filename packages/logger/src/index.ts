/**
 * @packageDocumentation
 *
 * A logger for libp2p based on [weald](https://www.npmjs.com/package/weald), a TypeScript port of the venerable [debug](https://www.npmjs.com/package/debug) module.
 *
 * @example
 *
 * ```TypeScript
 * import { logger } from '@libp2p/logger'
 *
 * const log = logger('libp2p:my:component:name')
 *
 * try {
 *   // an operation
 *   log('something happened: %s', 'it was ok')
 * } catch (err) {
 *   log.error('something bad happened: %o', err)
 * }
 *
 * log('with this peer: %p', {})
 * log('and this base58btc: %b', Uint8Array.from([0, 1, 2, 3]))
 * log('and this base32: %t', Uint8Array.from([4, 5, 6, 7]))
 * ```
 *
 * ```console
 * $ DEBUG=libp2p:* node index.js
 * something happened: it was ok
 * something bad happened: <stack trace>
 * with this peer: 12D3Foo
 * with this base58btc: Qmfoo
 * with this base32: bafyfoo
 * ```
 */

import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'
import { base64 } from 'multiformats/bases/base64'
import debug from 'weald'
import { truncatePeerId } from './utils.js'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Key } from 'interface-datastore'
import type { CID } from 'multiformats/cid'

// Add a formatter for converting to a base58 string
debug.formatters.b = (v?: Uint8Array): string => {
  return v == null ? 'undefined' : base58btc.baseEncode(v)
}

// Add a formatter for converting to a base32 string
debug.formatters.t = (v?: Uint8Array): string => {
  return v == null ? 'undefined' : base32.baseEncode(v)
}

// Add a formatter for converting to a base64 string
debug.formatters.m = (v?: Uint8Array): string => {
  return v == null ? 'undefined' : base64.baseEncode(v)
}

// Add a formatter for stringifying peer ids
debug.formatters.p = (v?: PeerId): string => {
  return v == null ? 'undefined' : v.toString()
}

// Add a formatter for stringifying CIDs
debug.formatters.c = (v?: CID): string => {
  return v == null ? 'undefined' : v.toString()
}

// Add a formatter for stringifying Datastore keys
debug.formatters.k = (v: Key): string => {
  return v == null ? 'undefined' : v.toString()
}

// Add a formatter for stringifying Multiaddrs
debug.formatters.a = (v?: Multiaddr): string => {
  return v == null ? 'undefined' : v.toString()
}

// Add a formatter for stringifying Errors
debug.formatters.e = (v?: Error): string => {
  return v == null ? 'undefined' : notEmpty(v.stack) ?? notEmpty(v.message) ?? v.toString()
}

export interface Logger {
  (formatter: any, ...args: any[]): void
  error(formatter: any, ...args: any[]): void
  trace(formatter: any, ...args: any[]): void
  enabled: boolean
}

export interface ComponentLogger {
  forComponent(name: string): Logger
}

function createDisabledLogger (namespace: string): debug.Debugger {
  const logger = (): void => {}
  logger.enabled = false
  logger.color = ''
  logger.diff = 0
  logger.log = (): void => {}
  logger.namespace = namespace
  logger.destroy = () => true
  logger.extend = () => logger

  return logger
}

export interface PeerLoggerOptions {
  prefixLength: number
  suffixLength: number
}

/**
 * Create a component logger that will prefix any log messages with a truncated
 * peer id.
 *
 * @example
 *
 * ```TypeScript
 * import { peerLogger } from '@libp2p/logger'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const peerId = peerIdFromString('12D3FooBar')
 * const logger = peerLogger(peerId)
 *
 * const log = logger.forComponent('my-component')
 * log.info('hello world')
 * // logs "12…oBar:my-component hello world"
 * ```
 */
export function peerLogger (peerId: PeerId, options: Partial<PeerLoggerOptions> = {}): ComponentLogger {
  return prefixLogger(truncatePeerId(peerId, options))
}

/**
 * Create a component logger that will prefix any log messages with the passed
 * string.
 *
 * @example
 *
 * ```TypeScript
 * import { prefixLogger } from '@libp2p/logger'
 *
 * const logger = prefixLogger('my-node')
 *
 * const log = logger.forComponent('my-component')
 * log.info('hello world')
 * // logs "my-node:my-component hello world"
 * ```
 */
export function prefixLogger (prefix: string): ComponentLogger {
  return {
    forComponent (name: string) {
      return logger(`${prefix}:${name}`)
    }
  }
}

/**
 * Create a component logger
 *
 * @example
 *
 * ```TypeScript
 * import { defaultLogger } from '@libp2p/logger'
 * import { peerIdFromString } from '@libp2p/peer-id'
 *
 * const logger = defaultLogger()
 *
 * const log = logger.forComponent('my-component')
 * log.info('hello world')
 * // logs "my-component hello world"
 * ```
 */
export function defaultLogger (): ComponentLogger {
  return {
    forComponent (name: string) {
      return logger(name)
    }
  }
}

/**
 * Creates a logger for the passed component name.
 *
 * @example
 *
 * ```TypeScript
 * import { logger } from '@libp2p/logger'
 *
 * const log = logger('my-component')
 * log.info('hello world')
 * // logs "my-component hello world"
 * ```
 */
export function logger (name: string): Logger {
  // trace logging is a no-op by default
  let trace: debug.Debugger = createDisabledLogger(`${name}:trace`)

  // look at all the debug names and see if trace logging has explicitly been enabled
  if (debug.enabled(`${name}:trace`) && debug.names.map((r: any) => r.toString()).find((n: string) => n.includes(':trace')) != null) {
    trace = debug(`${name}:trace`)
  }

  return Object.assign(debug(name), {
    error: debug(`${name}:error`),
    trace
  })
}

export function disable (): void {
  debug.disable()
}

export function enable (namespaces: string): void {
  debug.enable(namespaces)
}

export function enabled (namespaces: string): boolean {
  return debug.enabled(namespaces)
}

function notEmpty (str?: string): string | undefined {
  if (str == null) {
    return
  }

  str = str.trim()

  if (str.length === 0) {
    return
  }

  return str
}
