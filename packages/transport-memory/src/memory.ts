import { ConnectionFailedError, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { Memory } from '@multiformats/multiaddr-matcher'
import { connections } from './connections.js'
import { MemoryTransportListener } from './listener.js'
import type { MemoryTransportComponents, MemoryTransportInit } from './index.js'
import type { Connection, Transport, Listener, CreateListenerOptions, DialTransportOptions } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class MemoryTransport implements Transport {
  private readonly components: MemoryTransportComponents
  private readonly init: MemoryTransportInit

  constructor (components: MemoryTransportComponents, init: MemoryTransportInit = {}) {
    this.components = components
    this.init = init
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/memory'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (ma: Multiaddr, options: DialTransportOptions): Promise<Connection> {
    options.signal?.throwIfAborted()

    const memoryConnection = connections.get(`${ma.getPeerId() == null ? ma : ma.decapsulate('/p2p')}`)

    if (memoryConnection == null) {
      throw new ConnectionFailedError(`No memory listener found at ${ma}`)
    }

    const maConn = await memoryConnection.dial(this.components.peerId)

    try {
      options.signal?.throwIfAborted()

      return await options.upgrader.upgradeOutbound(maConn, {
        ...options,
        ...this.init.upgraderOptions
      })
    } catch (err: any) {
      maConn.abort(err)
      throw err
    }
  }

  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   */
  createListener (options: CreateListenerOptions): Listener {
    return new MemoryTransportListener(this.components, {
      ...options,
      ...this.init
    })
  }

  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(ma => Memory.exactMatch(ma))
  }

  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}
