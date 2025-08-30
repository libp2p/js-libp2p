import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'

export interface WebSocketMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name'> {
  websocket: WebSocket
}

class WebSocketMultiaddrConnection extends AbstractMultiaddrConnection {
  private websocket: WebSocket

  constructor (init: WebSocketMultiaddrConnectionInit) {
    super(init)

    this.websocket = init.websocket

    this.websocket.addEventListener('close', (evt) => {
      this.log('closed - code %d, reason "%s", wasClean %s', evt.code, evt.reason, evt.wasClean)

      if (!evt.wasClean) {
        this.onRemoteReset()
        return
      }

      this.onTransportClosed()
    }, { once: true })

    this.websocket.addEventListener('message', (evt) => {
      try {
        let buf: Uint8Array

        if (typeof evt.data === 'string') {
          buf = uint8ArrayFromString(evt.data)
        } else if (evt.data instanceof ArrayBuffer) {
          buf = new Uint8Array(evt.data, 0, evt.data.byteLength)
        } else {
          this.abort(new Error('Incorrect binary type'))
          return
        }

        this.log('incoming data', buf)

        this.onData(buf)
      } catch (err: any) {
        this.log.error('error receiving data - %e', err)
      }
    })
  }

  sendData (data: Uint8ArrayList): SendResult {
    for (const buf of data) {
      this.websocket.send(buf)
    }

    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  sendReset (): void {
    this.websocket.close(1006) // abnormal closure
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    this.websocket.close()
    options?.signal?.throwIfAborted()
  }

  sendPause (): void {
    // read backpressure is not supported
  }

  sendResume (): void {
    // read backpressure is not supported
  }
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn (init: WebSocketMultiaddrConnectionInit): MultiaddrConnection {
  return new WebSocketMultiaddrConnection(init)
}
