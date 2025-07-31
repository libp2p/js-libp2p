import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, MultiaddrConnection, Stream } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit } from '@libp2p/utils'

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
    let closedRead = false
    let closedWrite = false

    super({
      ...init,
      direction: init.stream.direction,
      log: init.log.newScope('stream-to-maconn')
    })

    this.init = init
    this.stream = init.stream

    this.stream.addEventListener('close', (evt) => {
      if (evt.error) {
        close(true)
      } else {
        close()
      }
    })

    // count incoming bytes
    this.stream.addEventListener('message', (evt) => {
      init.onDataRead?.(evt.data)
      this.onData(evt.data)
    })

    this.stream.addEventListener('closeRead', () => {
      closedRead = true
    })

    this.stream.addEventListener('closeWrite', () => {
      closedWrite = true
    })

    // piggyback on data send to count outgoing bytes
    const send = this.stream.send.bind(this.stream)
    this.stream.send = (buf: Uint8Array): boolean => {
      return send(buf)
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
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    await this.stream.close(options)
  }

  sendData (data: Uint8Array): boolean {
    this.init.onDataWrite?.(data)
    return this.stream.send(data)
  }

  sendDataV (data: Uint8Array[]): boolean {
    const list = Uint8ArrayList.fromUint8Arrays(data)
    this.init.onDataWrite?.(list)
    return this.stream.send(list)
  }

  sendReset (): void {
    this.stream.abort(new Error('An error occurred'))
  }

  sendCloseWrite (options?: AbortOptions): Promise<void> {
    return this.stream.closeWrite(options)
  }

  sendCloseRead (options?: AbortOptions): Promise<void> {
    return this.stream.closeRead(options)
  }

  sendPause (): void {
    this.stream.pause()
  }

  sendResume (): void {
    this.stream.resume()
  }
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (init: StreamMultiaddrConnectionInit): MultiaddrConnection {
  return new StreamMultiaddrConnection(init)
}
