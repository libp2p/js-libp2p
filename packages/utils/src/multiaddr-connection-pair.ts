import { StreamMessageEvent } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { raceSignal } from 'race-signal'
import { AbstractMultiaddrConnection } from './abstract-multiaddr-connection.ts'
import { MessageQueue } from './message-queue.ts'
import type { SendResult } from './abstract-message-stream.ts'
import type { MessageQueueInit } from './message-queue.ts'
import type { AbortOptions, Logger, MultiaddrConnection, MessageStreamDirection, TypedEventTarget } from '@libp2p/interface'
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
  id: string,
  log: Logger,
  direction: MessageStreamDirection
  local: MessageQueue<MockMulitaddrConnectionMessages>
  remote: TypedEventTarget<MockMulitaddrConnectionMessages>
  remoteAddr?: Multiaddr
}

let multiaddrConnectionId = 0

class MockMultiaddrConnection extends AbstractMultiaddrConnection {
  private local: MessageQueue<MockMulitaddrConnectionMessages>
  private remote: TypedEventTarget<MockMulitaddrConnectionMessages>

  constructor (init: MockMulitaddrConnectionInit) {
    super({
      ...init,
      remoteAddr: init.remoteAddr ?? multiaddr(`/ip4/127.0.0.1/tcp/${init.id}`)
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
      this.onRemoteCloseWrite()
    })
    this.remote.addEventListener('pause', (evt) => {
      this.local.pause()
    })
    this.remote.addEventListener('resume', (evt) => {
      this.local.resume()
    })
  }

  sendData (data: Uint8ArrayList): SendResult {
    const canSendMore = this.local.send(new StreamMessageEvent(data))

    return {
      sentBytes: data.byteLength,
      canSendMore
    }
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
  const inboundId = `${multiaddrConnectionId++}`
  const outboundId = `${multiaddrConnectionId++}`

  const outboundLog = defaultLogger().forComponent(`libp2p:mock-maconn:outbound:${inboundId}`)
  const inboundLog = defaultLogger().forComponent(`libp2p:mock-maconn:inbound:${outboundId}`)

  const targetA = new MessageQueue<MockMulitaddrConnectionMessages>({
    ...opts,
    log: outboundLog
  })
  const targetB = new MessageQueue<MockMulitaddrConnectionMessages>({
    ...opts,
    log: inboundLog
  })

  return [
    new MockMultiaddrConnection({
      id: inboundId,
      direction: 'outbound',
      local: targetA,
      remote: targetB,
      remoteAddr: opts?.outboundRemoteAddr,
      log: outboundLog
    }),
    new MockMultiaddrConnection({
      id: outboundId,
      direction: 'inbound',
      local: targetB,
      remote: targetA,
      remoteAddr: opts?.inboundRemoteAddr,
      log: inboundLog
    })
  ]
}
