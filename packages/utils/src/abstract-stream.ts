import { AbstractMessageStream } from './abstract-message-stream.js'
import type { MessageStreamInit } from './abstract-message-stream.js'
import type { Stream } from '@libp2p/interface'

export interface AbstractStreamInit extends MessageStreamInit {
  /**
   * A unique identifier for this stream
   */
  id: string

  /**
   * The protocol name for the stream, if it is known
   */
  protocol?: string
}

export abstract class AbstractStream extends AbstractMessageStream implements Stream {
  public id: string
  public protocol: string

  constructor (init: AbstractStreamInit) {
    super(init)

    this.id = init.id
    this.protocol = init.protocol ?? ''
  }
}
