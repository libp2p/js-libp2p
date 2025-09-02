import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, MultiaddrConnection, Stream } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'

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
  private stream: Stream
  private init: StreamMultiaddrConnectionInit

  constructor (init: StreamMultiaddrConnectionInit) {
    super({
      ...init,
      direction: init.stream.direction

    })

    this.init = init
    this.stream = init.stream

    this.stream.addEventListener('close', (evt) => {
      this.onTransportClosed(evt.error)
    })

    this.stream.addEventListener('remoteCloseWrite', (evt) => {
      this.onRemoteCloseWrite()

      // close our end when the remote closes
      this.close()
        .catch(err => {
          this.abort(err)
        })
    })

    // count incoming bytes
    this.stream.addEventListener('message', (evt) => {
      init.onDataRead?.(evt.data)
      this.onData(evt.data)
    })

    // forward drain events
    this.stream.addEventListener('drain', () => {
      this.safeDispatchEvent('drain')
    })
  }

  sendData (data: Uint8ArrayList): SendResult {
    this.init.onDataWrite?.(data)

    return {
      sentBytes: data.byteLength,
      canSendMore: this.stream.send(data)
    }
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    await this.stream.close(options)
  }

  sendReset (): void {
    this.stream.abort(new Error('An error occurred'))
  }

  sendPause (): void {
    this.stream.pause()
  }

  sendResume (): void {
    this.stream.resume()
  }
}

/**
 * Convert a Stream into a MultiaddrConnection.
 */
export function streamToMaConnection (init: StreamMultiaddrConnectionInit): MultiaddrConnection {
  return new StreamMultiaddrConnection(init)
}
