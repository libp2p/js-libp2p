/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/)
 * that operates in-memory only.
 *
 * This is intended for testing and can only be used to connect two libp2p nodes
 * that are running in the same process.
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { memory } from '@libp2p/memory'
 * import { multiaddr } from '@multiformats/multiaddr'
 *
 * const listener = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/memory/node-a'
 *     ]
 *   },
 *   transports: [
 *     memory()
 *   ]
 * })
 *
 * const dialer = await createLibp2p({
 *   transports: [
 *     memory()
 *   ]
 * })
 *
 * const ma = multiaddr('/memory/node-a')
 *
 * // dial the listener, timing out after 10s
 * const connection = await dialer.dial(ma, {
 *   signal: AbortSignal.timeout(10_000)
 * })
 *
 * // use connection...
 * ```
 *
 * @example Simulating slow connections
 *
 * A `latency` argument can be passed to the factory. Each byte array that
 * passes through the transport will be delayed by this many ms.
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { memory } from '@libp2p/memory'
 *
 * const dialer = await createLibp2p({
 *   transports: [
 *     memory({
 *       latency: 100
 *     })
 *   ]
 * })
 * ```
 */

import { ListenError, TypedEventEmitter } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import { nanoid } from 'nanoid'
import { MemoryConnection, connections } from './connections.js'
import type { MemoryTransportComponents, MemoryTransportInit } from './index.js'
import type { Listener, CreateListenerOptions, ListenerEvents, MultiaddrConnection, UpgraderOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface MemoryTransportListenerInit extends CreateListenerOptions, MemoryTransportInit {
  upgraderOptions?: UpgraderOptions
}

export class MemoryTransportListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private listenAddr?: Multiaddr
  private connection?: MemoryConnection
  private readonly components: MemoryTransportComponents
  private readonly init: MemoryTransportListenerInit

  constructor (components: MemoryTransportComponents, init: MemoryTransportListenerInit) {
    super()

    this.components = components
    this.init = init
  }

  async listen (ma: Multiaddr): Promise<void> {
    const [[, value]] = ma.stringTuples()

    const address = `/memory/${value ?? nanoid()}`

    if (value != null && connections.has(address)) {
      throw new ListenError(`Memory address ${address} already in use`)
    }

    this.connection = new MemoryConnection(this.components, {
      ...this.init,
      onConnection: this.onConnection.bind(this),
      address
    })
    this.listenAddr = multiaddr(address)

    connections.set(address, this.connection)

    queueMicrotask(() => {
      this.safeDispatchEvent('listening')
    })
  }

  onConnection (maConn: MultiaddrConnection): void {
    let signal: AbortSignal | undefined

    if (this.init.inboundUpgradeTimeout != null) {
      signal = AbortSignal.timeout(this.init.inboundUpgradeTimeout)
    }

    this.init.upgrader.upgradeInbound(maConn, {
      ...this.init.upgraderOptions,
      signal
    })
      .then(connection => {
        this.safeDispatchEvent('connection', {
          detail: connection
        })
      })
      .catch(err => {
        maConn.abort(err)
      })
  }

  getAddrs (): Multiaddr[] {
    if (this.listenAddr == null) {
      return []
    }

    return [
      this.listenAddr
    ]
  }

  async close (): Promise<void> {
    this.connection?.close()

    if (this.listenAddr != null) {
      connections.delete(this.listenAddr.toString())
    }

    queueMicrotask(() => {
      this.safeDispatchEvent('close')
    })
  }
}
