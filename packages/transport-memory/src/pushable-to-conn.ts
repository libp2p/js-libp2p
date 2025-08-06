import { StreamResetError } from '@libp2p/interface'
import { AbstractMultiaddrConnection } from '@libp2p/utils'
import delay from 'delay'
import map from 'it-map'
import { Uint8ArrayList } from 'uint8arraylist'
import type { MemoryConnection } from './connections.ts'
import type { StreamDirection, MultiaddrConnection, AbortOptions } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Pushable } from 'it-pushable'

export interface MemoryMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  localPushable: Pushable<Uint8Array | Uint8ArrayList>
  remotePushable: Pushable<Uint8Array | Uint8ArrayList>
  inactivityTimeout?: number
  closeTimeout?: number
  listeningAddr?: Multiaddr
  connection: MemoryConnection
  direction: StreamDirection
}

class MemoryMultiaddrConnection extends AbstractMultiaddrConnection {
  private localPushable: Pushable<Uint8Array | Uint8ArrayList>

  constructor (init: MemoryMultiaddrConnectionInit) {
    super(init)

    this.localPushable = init.localPushable

    Promise.resolve()
      .then(async () => {
        for await (const buf of map(init.remotePushable, async buf => {
          if (init.connection.latency > 0) {
            await delay(init.connection.latency)
          }

          return buf
        })) {
          this.onData(buf)
        }
      })
      .catch(err => {
        this.abort(err)
      })
  }

  sendReset (): void {
    this.localPushable.end(new StreamResetError())
  }

  sendData (data: Uint8Array | Uint8ArrayList): SendResult {
    this.localPushable.push(data)
    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.localPushable.end()
    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendPause (): void {
    // read backpressure is not supported
  }

  sendResume (): void {
    // read backpressure is not supported
  }
}

export function pushableToMaConn (init: MemoryMultiaddrConnectionInit): MultiaddrConnection {
  return new MemoryMultiaddrConnection(init)
}
