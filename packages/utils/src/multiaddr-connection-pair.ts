import { StreamMessageEvent } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { pEvent } from 'p-event'
import { raceSignal } from 'race-signal'
import { AbstractMultiaddrConnection } from './abstract-multiaddr-connection.ts'
import { MessageQueue } from './message-queue.ts'
import type { SendResult } from './abstract-message-stream.ts'
import type { AbstractMultiaddrConnectionInit } from './abstract-multiaddr-connection.ts'
import type { MessageQueueEvents, MessageQueueInit } from './message-queue.ts'
import type { AbortOptions, Logger, MultiaddrConnection, MessageStreamDirection, TypedEventTarget } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

interface MockMultiaddrConnectionMessages extends MessageQueueEvents {
  close: Event
  pause: Event
  resume: Event
}

export interface MockMultiaddrConnectionInit extends AbstractMultiaddrConnectionInit {
  id: string,
  log: Logger,
  direction: MessageStreamDirection
  local: MessageQueue<MockMultiaddrConnectionMessages>
  remote: TypedEventTarget<MockMultiaddrConnectionMessages>
  remoteAddr: Multiaddr
}

let multiaddrConnectionId = 0

class MockMultiaddrConnection extends AbstractMultiaddrConnection {
  private local: MessageQueue<MockMultiaddrConnectionMessages>
  private remote: TypedEventTarget<MockMultiaddrConnectionMessages>

  constructor (init: MockMultiaddrConnectionInit) {
    super(init)

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
      this.onTransportClosed()
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

  async sendClose (options?: AbortOptions): Promise<void> {
    if (this.local.needsDrain) {
      await pEvent(this.local, 'drain', {
        signal: options?.signal
      })
    }

    return raceSignal(new Promise<void>((resolve, reject) => {
      this.local.send(new Event('close'))
      this.local.onIdle().then(resolve, reject)
    }), options?.signal)
  }

  sendPause (): void {
    this.local.send(new Event('pause'))
  }

  sendResume (): void {
    this.local.send(new Event('resume'))
  }
}

export interface MultiaddrConnectionPairOptions extends MessageQueueInit {
  outbound?: Partial<MockMultiaddrConnectionInit>
  inbound?: Partial<MockMultiaddrConnectionInit>
}

export function multiaddrConnectionPair (opts: MultiaddrConnectionPairOptions = {}): [MultiaddrConnection, MultiaddrConnection] {
  const inboundId = `${multiaddrConnectionId++}`
  const outboundId = `${multiaddrConnectionId++}`

  const outboundLog = defaultLogger().forComponent(`libp2p:mock-maconn:outbound:${inboundId}`)
  const inboundLog = defaultLogger().forComponent(`libp2p:mock-maconn:inbound:${outboundId}`)

  const targetA = new MessageQueue<MockMultiaddrConnectionMessages>({
    ...opts,
    log: outboundLog
  })
  const targetB = new MessageQueue<MockMultiaddrConnectionMessages>({
    ...opts,
    log: inboundLog
  })

  return [
    new MockMultiaddrConnection({
      ...opts.outbound,
      id: outboundId,
      direction: 'outbound',
      local: targetA,
      remote: targetB,
      remoteAddr: opts?.outbound?.remoteAddr ?? multiaddr(`/ip4/127.0.0.1/tcp/${outboundId}`),
      log: outboundLog
    }),
    new MockMultiaddrConnection({
      ...opts.inbound,
      id: inboundId,
      direction: 'inbound',
      local: targetB,
      remote: targetA,
      remoteAddr: opts?.inbound?.remoteAddr ?? multiaddr(`/ip4/127.0.0.1/tcp/${inboundId}`),
      log: inboundLog
    })
  ]
}
