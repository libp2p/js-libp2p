import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import { byteStream } from 'it-byte-stream'
import forEach from 'it-foreach'
import { pipe } from 'it-pipe'
import type { AbortOptions, MultiaddrConnection, Stream } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'
import type { ByteStream } from 'it-byte-stream'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface StreamMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface StreamMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'direction'> {
  stream: Stream

  /**
   * A callback invoked when data is read from the stream
   */
  onDataRead?(buf: Uint8ArrayList | Uint8Array): void

  /**
   * A callback invoked when data is written to the stream
   */
  onDataWrite?(buf: Uint8ArrayList | Uint8Array): void
}

class StreamMultiaddrConnection extends AbstractMultiaddrConnection {
  private stream: ByteStream<Stream>

  constructor (components: StreamMultiaddrConnectionComponents, init: StreamMultiaddrConnectionInit) {
    let closedRead = false
    let closedWrite = false

    super(components, {
      ...init,
      name: 'stream-to-maconn',
      direction: init.stream.direction
    })

    this.stream = byteStream(init.stream)

    // piggyback on `stream.close` invocations to close multiaddr connection
    const streamClose = init.stream.close.bind(init.stream)
    init.stream.close = async (options): Promise<void> => {
      await streamClose(options)
      close(true)
    }

    // piggyback on `stream.abort` invocations to close multiaddr connection
    const streamAbort = init.stream.abort.bind(init.stream)
    init.stream.abort = (err): void => {
      streamAbort(err)
      close(true)
    }

    // piggyback on `stream.sink` invocations to close multiaddr connection
    const streamSink = init.stream.sink.bind(init.stream)
    init.stream.sink = async (source): Promise<void> => {
      try {
        await streamSink(
          pipe(
            source,
            (source) => forEach(source, buf => init.onDataWrite?.(buf))
          )
        )
      } catch (err: any) {
        this.log.error('errored - %e', err)

        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          this.log.error('error in sink - %e', err)
        }
      } finally {
        closedWrite = true
        close()
      }
    }

    const self = this

    function close (force?: boolean): void {
      if (force === true) {
        closedRead = true
        closedWrite = true
      }

      if (closedRead && closedWrite && self.timeline.close == null) {
        self.close()
          .catch(err => {
            self.abort(err)
          })
      }
    }

    Promise.resolve()
      .then(async () => {
        while (true) {
          const buf = await this.stream.read({
            signal: AbortSignal.timeout(init.inactivityTimeout ?? 5_000)
          })

          if (buf == null) {
            break
          }

          init.onDataRead?.(buf)
          this.sourcePush(buf)
        }
      })
      .catch(err => {
        this.abort(err)
      })
      .finally(() => {
        closedRead = true
        close()
      })
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    await this.stream.unwrap().close(options)
  }

  async sendData (data: Uint8ArrayList, options?: AbortOptions): Promise<void> {
    await this.stream.write(data, options)
  }

  sendReset (): void {
    this.stream.unwrap().abort(new Error('An error occurred'))
  }
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (components: StreamMultiaddrConnectionComponents, init: StreamMultiaddrConnectionInit): MultiaddrConnection {
  return new StreamMultiaddrConnection(components, init)
}
