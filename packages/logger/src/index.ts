/**
 * @packageDocumentation
 *
 * A map that reports it's size to the libp2p [Metrics](https://github.com/libp2p/js-libp2p-interfaces/tree/master/packages/libp2p-interfaces/src/metrics#readme) system.
 *
 * If metrics are disabled a regular map is used.
 *
 * @example
 *
 * ```JavaScript
 * import { logger } from '@libp2p/logger'
 *
 * const log = logger('libp2p:my:component:name')
 *
 * log('something happened: %s', 'it was ok')
 * log.error('something bad happened: %o', err)
 *
 * log('with this peer: %p', aPeerId)
 * log('and this base58btc: %b', aUint8Array)
 * log('and this base32: %t', aUint8Array)
 *  ```
 * ```console
 * $ DEBUG=libp2p:* node index.js
 * something happened: it was ok
 * something bad happened: <stack trace>
 * with this peer: 12D3Foo
 * with this base58btc: Qmfoo
 * with this base32: bafyfoo
 * ```
 */

import debug from 'debug'
import { base32 } from 'multiformats/bases/base32'
import { base58btc } from 'multiformats/bases/base58'
import { base64 } from 'multiformats/bases/base64'
import type { PeerId } from '@libp2p/interface/peer-id'
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

export interface Logger {
  (formatter: any, ...args: any[]): void
  error(formatter: any, ...args: any[]): void
  trace(formatter: any, ...args: any[]): void
  enabled: boolean
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

export function logger (name: string): Logger {
  // trace logging is a no-op by default
  let trace: debug.Debugger = createDisabledLogger(`${name}:trace`)

  // look at all the debug names and see if trace logging has explicitly been enabled
  if (debug.enabled(`${name}:trace`) && debug.names.map(r => r.toString()).find(n => n.includes(':trace')) != null) {
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
