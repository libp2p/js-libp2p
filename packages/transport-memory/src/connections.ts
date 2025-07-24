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
 */

import { ConnectionFailedError } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import delay from 'delay'
import { pushable } from 'it-pushable'
import { raceSignal } from 'race-signal'
import { pushableToMaConn } from './pushable-to-conn.ts'
import type { MemoryTransportComponents, MemoryTransportInit } from './index.js'
import type { MultiaddrConnection, PeerId } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export const connections = new Map<string, MemoryConnection>()

interface MemoryConnectionHandler {
  (maConn: MultiaddrConnection): void
}

interface MemoryConnectionInit extends MemoryTransportInit {
  onConnection: MemoryConnectionHandler
  address: string
}

export class MemoryConnection {
  public readonly latency: number

  private readonly components: MemoryTransportComponents
  private readonly init: MemoryConnectionInit
  private readonly connections: Set<MultiaddrConnection>

  constructor (components: MemoryTransportComponents, init: MemoryConnectionInit) {
    this.components = components
    this.init = init
    this.connections = new Set()
    this.latency = init.latency ?? 0
  }

  async dial (dialingPeerId: PeerId, signal: AbortSignal): Promise<MultiaddrConnection> {
    const self = this

    let dialerEnded = false
    let listenerEnded = false

    const dialerPushable = pushable<Uint8Array | Uint8ArrayList>({
      onEnd (err) {
        dialerEnded = true
        self.connections.delete(dialer)

        if (!listenerEnded) {
          listenerPushable.end(err)
        }
      }
    })
    const listenerPushable = pushable<Uint8Array | Uint8ArrayList>({
      onEnd (err) {
        listenerEnded = true
        self.connections.delete(listener)

        if (!dialerEnded) {
          dialerPushable.end(err)
        }
      }
    })

    const dialer = pushableToMaConn(this.components, {
      connection: this,
      remoteAddr: multiaddr(`${this.init.address}/p2p/${this.components.peerId}`),
      direction: 'outbound',
      localPushable: dialerPushable,
      remotePushable: listenerPushable
    })

    const listener = pushableToMaConn(this.components, {
      connection: this,
      remoteAddr: multiaddr(`${this.init.address}-outgoing/p2p/${dialingPeerId}`),
      direction: 'inbound',
      localPushable: listenerPushable,
      remotePushable: dialerPushable
    })

    this.connections.add(dialer)
    this.connections.add(listener)

    await raceSignal(delay(this.latency), signal)

    this.init.onConnection(listener)

    return dialer
  }

  close (): void {
    [...this.connections].forEach(maConn => {
      maConn.abort(new ConnectionFailedError('Memory Connection closed'))
    })
  }
}
