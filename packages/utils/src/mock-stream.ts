import { StreamMessageEvent } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { raceSignal } from 'race-signal'
import { AbstractStream } from './abstract-stream.ts'
import type { SendResult } from './abstract-message-stream.ts'
import type { MessageQueue } from './message-queue.ts'
import type { AbortOptions, StreamDirection, TypedEventTarget } from '@libp2p/interface'

interface MockStreamMessages {
  message: MessageEvent
  reset: Event
  closeWrite: Event
  closeRead: Event
}

interface MockStreamInit {
  delay?: number
  direction: StreamDirection
  local: MessageQueue<MockStreamMessages>
  remote: TypedEventTarget<MockStreamMessages>
}

let streamId = 0

export class MockStream extends AbstractStream {
  private local: MessageQueue<MockStreamMessages>
  private remote: TypedEventTarget<MockStreamMessages>

  constructor (init: MockStreamInit) {
    const id = `${streamId++}`

    super({
      ...init,
      id,
      log: defaultLogger().forComponent(`libp2p:stream-pair:${init.direction}:${id}`)
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
    this.remote.addEventListener('closeRead', (evt) => {
      if (this.status !== 'open' && this.status !== 'closing') {
        return
      }

      this.onRemoteClosedRead()
    })
    this.remote.addEventListener('closeWrite', (evt) => {
      if (this.status !== 'open' && this.status !== 'closing') {
        return
      }

      this.onRemoteClosedWrite()
    })
  }

  sendData (data: Uint8Array): SendResult {
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
      this.local.send(new Event('closeWrite'))
      this.local.onIdle().then(resolve, reject)
    }), options?.signal)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    return raceSignal(new Promise<void>((resolve, reject) => {
      this.local.send(new Event('closeRead'))
      this.local.onIdle().then(resolve, reject)
    }), options?.signal)
  }

  sendPause (): void {
    this.local.send(new Event('pause'))
  }

  sendResume (): void {
    this.local.send(new Event('resume'))
  }

  onRemotePaused (): void {
    this.local.pause()
  }

  onRemoteResumed (): void {
    this.local.resume()
  }
}
