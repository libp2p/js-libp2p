/**
 * @packageDocumentation
 *
 * multistream-select is protocol multiplexing per connection/stream. [Full spec here](https://github.com/multiformats/multistream-select)
 *
 * ## Select a protocol flow
 *
 * The caller will send "interactive" messages, expecting for some acknowledgement from the callee, which will "select" the handler for the desired and supported protocol:
 *
 * ```
 * < /multistream-select/0.3.0  # i speak multistream-select/0.3.0
 * > /multistream-select/0.3.0  # ok, let's speak multistream-select/0.3.0
 * > /ipfs-dht/0.2.3            # i want to speak ipfs-dht/0.2.3
 * < na                         # ipfs-dht/0.2.3 is not available
 * > /ipfs-dht/0.1.9            # What about ipfs-dht/0.1.9 ?
 * < /ipfs-dht/0.1.9            # ok let's speak ipfs-dht/0.1.9 -- in a sense acts as an ACK
 * > <dht-message>
 * > <dht-message>
 * > <dht-message>
 * ```
 */

import { PROTOCOL_ID } from './constants.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Duplex, Source } from 'it-stream-types'

export { PROTOCOL_ID }

export interface ProtocolStream<TSource, TSink = TSource, RSink = Promise<void>> {
  stream: Duplex<AsyncGenerator<TSource>, Source<TSink>, RSink>
  protocol: string
}

export interface ByteArrayInit extends AbortOptions {
  writeBytes: true
}

export interface ByteListInit extends AbortOptions {
  writeBytes?: false
}

export interface MultistreamSelectInit extends AbortOptions {
  writeBytes?: boolean
}

export { select, lazySelect } from './select.js'
export { handle } from './handle.js'
