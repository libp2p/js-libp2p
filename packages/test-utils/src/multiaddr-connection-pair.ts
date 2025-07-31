import { StreamMessageEvent } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { raceSignal } from 'race-signal'
import { MessageQueue } from './message-queue.ts'
import type { MessageQueueInit } from './message-queue.ts'
import type { AbortOptions, MultiaddrConnection, StreamDirection, TypedEventTarget } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

interface MockMulitaddrConnectionMessages {
  message: MessageEvent
  reset: Event
  close: Event
  pause: Event
  resume: Event
}

interface MockMulitaddrConnectionInit {
  direction: StreamDirection
  local: MessageQueue<MockMulitaddrConnectionMessages>
  remote: TypedEventTarget<MockMulitaddrConnectionMessages>
  remoteAddr?: Multiaddr
}

let multiaddrConnectionId = 0

class MockMultiaddrConnection extends AbstractMultiaddrConnection {
  private local: MessageQueue<MockMulitaddrConnectionMessages>
  private remote: TypedEventTarget<MockMulitaddrConnectionMessages>

  constructor (init: MockMulitaddrConnectionInit) {
    const id = `${multiaddrConnectionId++}`

    super({
      ...init,
      remoteAddr: init.remoteAddr ?? multiaddr(`/ip4/127.0.0.1/tcp/${id}`),
      log: defaultLogger().forComponent(`libp2p:mock-maconn:${init.direction}:${id}`)
    })

    this.local = init.local
    this.remote = init.remote

    this.local.addEventListener('drain', () => {
      this.safeDispatchEvent('drain')
    })

    this.remote.addEventListener('message', (evt) => {
      if (this.status !== 'open') {
        return
      }

      this.onData(evt.data)
    })
    this.remote.addEventListener('reset', (evt) => {
      if (this.status !== 'open') {
        return
      }

      this.onRemoteReset()
    })
    this.remote.addEventListener('close', (evt) => {
      this.onRemoteClose()
    })
    this.remote.addEventListener('pause', (evt) => {
      this.local.pause()
    })
    this.remote.addEventListener('resume', (evt) => {
      this.local.resume()
    })
  }

  sendData (data: Uint8Array | Uint8ArrayList): boolean {
    return this.local.send(new StreamMessageEvent(data))
  }

  sendReset (): void {
    this.local.send(new Event('reset'))
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    return raceSignal(new Promise<void>((resolve, reject) => {
      this.local.send(new Event('close'))
      this.local.onIdle().then(resolve, reject)
    }), options?.signal)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendPause (): void {
    this.local.send(new Event('pause'))
  }

  sendResume (): void {
    this.local.send(new Event('resume'))
  }
}

export interface MultiaddrConnectionPairOptions extends MessageQueueInit {
  outboundRemoteAddr?: Multiaddr
  inboundRemoteAddr?: Multiaddr
}

export function multiaddrConnectionPair (opts: MultiaddrConnectionPairOptions = {}): [MultiaddrConnection, MultiaddrConnection] {
  const targetA = new MessageQueue<MockMulitaddrConnectionMessages>(opts)
  const targetB = new MessageQueue<MockMulitaddrConnectionMessages>(opts)

  return [
    new MockMultiaddrConnection({
      direction: 'outbound',
      local: targetA,
      remote: targetB,
      remoteAddr: opts?.outboundRemoteAddr
    }),
    new MockMultiaddrConnection({
      direction: 'inbound',
      local: targetB,
      remote: targetA,
      remoteAddr: opts?.inboundRemoteAddr
    })
  ]
}
