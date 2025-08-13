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

  /**
   * The muxer this stream was created by has closed - this stream should exit
   * without sending any further messages. Any unread data can still be read but
   * otherwise this stream is now closed.
   */
  onMuxerClosed (): void {
    if (this.remoteReadStatus !== 'closed') {
      this.remoteReadStatus = 'closed'
      this.timeline.remoteCloseRead = Date.now()
    }

    if (this.remoteWriteStatus !== 'closed') {
      this.remoteWriteStatus = 'closed'
      this.timeline.remoteCloseWrite = Date.now()
    }

    if (this.writeStatus !== 'closed') {
      this.writeStatus = 'closed'
      this.timeline.closeWrite = Date.now()
    }

    this.onClosed()
  }
}
