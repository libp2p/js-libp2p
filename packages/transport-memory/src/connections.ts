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
import map from 'it-map'
import { pushable } from 'it-pushable'
import { raceSignal } from 'race-signal'
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
  private readonly components: MemoryTransportComponents
  private readonly init: MemoryConnectionInit
  private readonly connections: Set<MultiaddrConnection>
  private readonly latency: number

  constructor (components: MemoryTransportComponents, init: MemoryConnectionInit) {
    this.components = components
    this.init = init
    this.connections = new Set()
    this.latency = init.latency ?? 0
  }

  async dial (dialingPeerId: PeerId, signal: AbortSignal): Promise<MultiaddrConnection> {
    const dialerPushable = pushable<Uint8Array | Uint8ArrayList>()
    const listenerPushable = pushable<Uint8Array | Uint8ArrayList>()
    const self = this

    const dialer: MultiaddrConnection = {
      source: (async function * () {
        yield * map(listenerPushable, async buf => {
          if (self.latency > 0) {
            await delay(self.latency)
          }

          return buf
        })
      })(),
      sink: async (source) => {
        for await (const buf of source) {
          dialerPushable.push(buf)
        }
      },
      close: async () => {
        dialerPushable.end()
        this.connections.delete(dialer)
        dialer.timeline.close = Date.now()

        listenerPushable.end()
        this.connections.delete(listener)
        listener.timeline.close = Date.now()
      },
      abort: (err) => {
        dialerPushable.end(err)
        this.connections.delete(dialer)
        dialer.timeline.close = Date.now()

        listenerPushable.end(err)
        this.connections.delete(listener)
        listener.timeline.close = Date.now()
      },
      timeline: {
        open: Date.now()
      },
      remoteAddr: multiaddr(`${this.init.address}/p2p/${this.components.peerId}`),
      log: this.components.logger.forComponent('libp2p:memory')
    }

    const listener: MultiaddrConnection = {
      source: (async function * () {
        yield * map(dialerPushable, async buf => {
          if (self.latency > 0) {
            await delay(self.latency)
          }

          return buf
        })
      })(),
      sink: async (source) => {
        for await (const buf of source) {
          listenerPushable.push(buf)
        }
      },
      close: async () => {
        listenerPushable.end()
        this.connections.delete(listener)
        listener.timeline.close = Date.now()

        dialerPushable.end()
        this.connections.delete(dialer)
        dialer.timeline.close = Date.now()
      },
      abort: (err) => {
        listenerPushable.end(err)
        this.connections.delete(listener)
        listener.timeline.close = Date.now()

        dialerPushable.end(err)
        this.connections.delete(dialer)
        dialer.timeline.close = Date.now()
      },
      timeline: {
        open: Date.now()
      },
      remoteAddr: multiaddr(`${this.init.address}-outgoing/p2p/${dialingPeerId}`),
      log: this.components.logger.forComponent('libp2p:memory')
    }

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
