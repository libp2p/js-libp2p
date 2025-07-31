import { StreamResetError } from '@libp2p/interface'
import { AbstractMessageStream } from './abstract-message-stream.js'
import type { MessageStreamInit } from './abstract-message-stream.js'
import type { StreamDirection, Stream, StreamMessageEvent, StreamCloseEvent } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface AbstractStreamInit extends MessageStreamInit {
  /**
   * A unique identifier for this stream
   */
  id: string

  /**
   * The stream direction
   */
  direction: StreamDirection

  /**
   * The protocol name for the stream, if it is known
   */
  protocol?: string
}

export abstract class AbstractStream extends AbstractMessageStream implements Stream {
  public id: string
  public protocol: string
  public direction: StreamDirection

  private remoteClosedWrite: PromiseWithResolvers<void>

  constructor (init: AbstractStreamInit) {
    super(init)

    this.id = init.id
    this.protocol = init.protocol ?? ''
    this.direction = init.direction
    this.remoteClosedWrite = Promise.withResolvers<void>()
    this.remoteClosedWrite.promise.catch(() => {
      // prevent unhandled promise rejections
    })
  }

  async * [Symbol.asyncIterator] (): AsyncGenerator<Uint8Array | Uint8ArrayList> {
    while (true) {
      const data = Promise.withResolvers<Uint8Array | Uint8ArrayList | undefined>()

      const onMessage = (evt: StreamMessageEvent): void => {
        data.resolve(evt.data)
      }
      this.addEventListener('message', onMessage)

      const onClose = (evt: StreamCloseEvent): void => {
        if (evt.error != null) {
          data.reject(evt.error)
        } else {
          data.resolve(undefined)
        }
      }
      this.addEventListener('close', onClose)

      this.remoteClosedWrite.promise
        .then(() => {
          data.resolve(undefined)
        })
        .catch(err => {
          data.reject(err)
        })

      try {
        const buf = await data.promise

        if (buf == null) {
          return
        }

        yield buf
      } finally {
        this.removeEventListener('message', onMessage)
        this.removeEventListener('close', onClose)
      }
    }
  }

  onRemoteClosedWrite (): void {
    super.onRemoteClosedWrite()

    this.remoteClosedWrite.resolve()
  }

  onRemoteReset (): void {
    super.onRemoteReset()

    this.remoteClosedWrite.reject(new StreamResetError())
  }
}
