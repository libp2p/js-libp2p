import { pushable } from 'it-pushable'
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

  constructor (init: AbstractStreamInit) {
    super(init)

    this.id = init.id
    this.protocol = init.protocol ?? ''
    this.direction = init.direction
  }

  async * [Symbol.asyncIterator] (): AsyncGenerator<Uint8Array | Uint8ArrayList> {
    const output = pushable<Uint8Array | Uint8ArrayList>()

    const onMessage = (evt: StreamMessageEvent): void => {
      output.push(evt.data)
    }
    this.addEventListener('message', onMessage)

    const onClose = (evt: StreamCloseEvent): void => {
      output.end(evt.error)
    }
    this.addEventListener('close', onClose)

    const onRemoteClosedWrite = (evt: StreamCloseEvent): void => {
      output.end(evt.error)
    }
    this.addEventListener('remoteClosedWrite', onRemoteClosedWrite)

    try {
      yield * output
    } finally {
      this.removeEventListener('message', onMessage)
      this.removeEventListener('close', onClose)
      this.removeEventListener('remoteClosedWrite', onRemoteClosedWrite)
    }
  }
}
