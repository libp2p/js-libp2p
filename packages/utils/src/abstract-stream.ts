import { pEvent } from 'p-event'
import { AbstractMessageStream } from './abstract-message-stream.js'
import type { MessageStreamInit } from './abstract-message-stream.js'
import type { AbortOptions, Stream } from '@libp2p/interface'

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

  async close (options?: AbortOptions): Promise<void> {
    if (this.writeStatus === 'closing' || this.writeStatus === 'closed') {
      return
    }

    this.writeStatus = 'closing'

    if (this.writeBuffer.byteLength > 0) {
      this.log('waiting for write queue to become idle before closing writable end of stream, %d unsent bytes', this.writeBuffer.byteLength)
      await pEvent(this, 'idle', {
        ...options,
        rejectionEvents: [
          'close'
        ]
      })
    }

    await this.sendCloseWrite(options)

    this.writeStatus = 'closed'

    this.log('closed writable end gracefully')

    if (this.remoteWriteStatus === 'closed') {
      this.onTransportClosed()
    }
  }

  async closeRead (options?: AbortOptions): Promise<void> {
    if (this.readStatus === 'closing' || this.readStatus === 'closed') {
      return
    }

    // throw away any unread data
    if (this.readBuffer.byteLength > 0) {
      this.readBuffer.consume(this.readBuffer.byteLength)
    }

    this.readStatus = 'closing'

    await this.sendCloseRead(options)

    this.readStatus = 'closed'

    this.log('closed readable end gracefully')
  }

  /**
   * Send a message to the remote end of the stream, informing them that we will
   * send no more data messages.
   */
  abstract sendCloseWrite (options?: AbortOptions): Promise<void>

  /**
   * If supported, send a message to the remote end of the stream, informing
   * them that we will read no more data messages.
   */
  abstract sendCloseRead (options?: AbortOptions): Promise<void>
}
