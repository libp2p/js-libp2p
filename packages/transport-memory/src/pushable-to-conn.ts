import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import delay from 'delay'
import map from 'it-map'
import type { MemoryConnection } from './connections.ts'
import type { AbortOptions, Direction, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Pushable } from 'it-pushable'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface MemoryMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface MemoryMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  localPushable: Pushable<Uint8Array | Uint8ArrayList>
  remotePushable: Pushable<Uint8Array | Uint8ArrayList>
  inactivityTimeout?: number
  closeTimeout?: number
  listeningAddr?: Multiaddr
  connection: MemoryConnection
  direction: Direction
}

class MemoryMultiaddrConnection extends AbstractMultiaddrConnection {
  private localPushable: Pushable<Uint8Array | Uint8ArrayList>

  constructor (components: MemoryMultiaddrConnectionComponents, init: MemoryMultiaddrConnectionInit) {
    super(components, {
      ...init,
      name: 'memory'
    })

    this.localPushable = init.localPushable

    Promise.resolve()
      .then(async () => {
        for await (const buf of map(init.remotePushable, async buf => {
          if (init.connection.latency > 0) {
            await delay(init.connection.latency)
          }

          return buf
        })) {
          this.sourcePush(buf)
        }
      })
      .catch(err => {
        this.abort(err)
      })
  }

  async closeStream (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendData (data: Uint8ArrayList, options?: AbortOptions): void | Promise<void> {
    this.localPushable.push(data)
  }

  sendReset (): void | Promise<void> {
    this.localPushable.end(new Error('An error occurred'))
  }

  sendClose (): void {
    this.localPushable.end()
  }
}

export function pushableToMaConn (components: MemoryMultiaddrConnectionComponents, init: MemoryMultiaddrConnectionInit): MultiaddrConnection {
  return new MemoryMultiaddrConnection(components, init)
}
