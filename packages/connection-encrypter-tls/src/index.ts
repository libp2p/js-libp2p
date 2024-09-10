/**
 * @packageDocumentation
 *
 * Implements the spec at https://github.com/libp2p/specs/blob/master/tls/tls.md
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { tls } from '@libp2p/tls'
 *
 * const node = await createLibp2p({
 *   // ...other options
 *   connectionEncrypters: [
 *     tls()
 *   ]
 * })
 * ```
 */

import { TLS } from './tls.js'
import type { ComponentLogger, ConnectionEncrypter, PrivateKey } from '@libp2p/interface'

export const PROTOCOL = '/tls/1.0.0'

export interface TLSComponents {
  privateKey: PrivateKey
  logger: ComponentLogger
}

export function tls (): (components: TLSComponents) => ConnectionEncrypter {
  return (components) => new TLS(components)
}
