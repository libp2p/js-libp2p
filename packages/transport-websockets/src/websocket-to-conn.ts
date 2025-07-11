import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'

export interface WebSocketMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface WebSocketMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name'> {
  websocket: WebSocket
}

class WebSocketMultiaddrConnection extends AbstractMultiaddrConnection {
  private websocket: WebSocket

  constructor (components: WebSocketMultiaddrConnectionComponents, init: WebSocketMultiaddrConnectionInit) {
    super(components, {
      ...init,
      name: 'websockets'
    })

    this.websocket = init.websocket

    // track local vs remote closing
    let closedLocally = false
    const close = this.websocket.close.bind(init.websocket)
    this.websocket.close = (...args) => {
      closedLocally = true
      return close(...args)
    }

    this.websocket.addEventListener('close', (evt) => {
      this.log('closed %s, code %d, reason "%s", wasClean %s', closedLocally ? 'locally' : 'by remote', evt.code, evt.reason, evt.wasClean)

      if (!evt.wasClean) {
        this.reset()
        return
      }

      if (this.status === 'open') {
        this.remoteCloseRead()
        this.remoteCloseWrite()
      }
    }, { once: true })

    this.websocket.addEventListener('message', (evt) => {
      this.onData(evt)
        .catch(err => {
          this.log.error('error receiving data - %e', err)
        })
    })
  }

  private async onData (evt: MessageEvent<string | Blob | ArrayBuffer>): Promise<void> {
    let buf: Uint8Array

    if (evt.data instanceof Blob) {
      buf = await evt.data.bytes()
    } else if (typeof evt.data === 'string') {
      buf = uint8ArrayFromString(evt.data)
    } else {
      buf = new Uint8Array(evt.data, 0, evt.data.byteLength)
    }

    this.sourcePush(buf)
  }

  sendData (data: Uint8ArrayList): void {
    for (const buf of data) {
      this.websocket.send(buf)
    }
  }

  sendReset (): void {
    this.websocket.close(1006) // abnormal closure
  }

  sendClose (): void {
    this.websocket.close()
  }
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn (components: WebSocketMultiaddrConnectionComponents, init: WebSocketMultiaddrConnectionInit): MultiaddrConnection {
  return new WebSocketMultiaddrConnection(components, init)
}
