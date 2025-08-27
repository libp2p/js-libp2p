import { logger } from '@libp2p/logger'
import { lpStream } from '@libp2p/utils'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { LengthPrefixedStream } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p:daemon-protocol:stream-handler')

export interface StreamHandlerOptions {
  stream: MultiaddrConnection
  maxLength?: number
}

export class StreamHandler {
  private readonly stream: MultiaddrConnection
  private readonly lp: LengthPrefixedStream<MultiaddrConnection>

  /**
   * Create a stream handler for connection
   */
  constructor (opts: StreamHandlerOptions) {
    const { stream, maxLength } = opts

    this.stream = stream
    this.lp = lpStream(this.stream, { maxDataLength: maxLength ?? 4096 })
  }

  /**
   * Read and decode message
   */
  async read (): Promise<Uint8ArrayList | undefined> {
    try {
      return await this.lp.read()
    } catch (err) {
      log.error('read received no value', err)
    }
  }

  async write (msg: Uint8Array | Uint8ArrayList): Promise<void> {
    log('write message')
    await this.lp.write(msg)
  }

  /**
   * Return the handshake rest stream and invalidate handler
   */
  rest (): MultiaddrConnection {
    return this.lp.unwrap()
  }

  /**
   * Close the stream
   */
  async close (): Promise<void> {
    log('closing the stream')
    await this.rest().close()
  }
}
