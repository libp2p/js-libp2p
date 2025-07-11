import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import type { MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'

export interface WebTransportSessionMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface WebTransportSessionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  cleanUpWTSession(metric: string): void
}

class WebTransportSessionMultiaddrConnection extends AbstractMultiaddrConnection {
  private cleanUpWTSession: (metric: string) => void

  constructor (components: WebTransportSessionMultiaddrConnectionComponents, init: WebTransportSessionMultiaddrConnectionInit) {
    super(components, {
      ...init,
      name: 'webtransport'
    })

    this.cleanUpWTSession = init.cleanUpWTSession
  }

  sendData (): void {

  }

  sendReset (): void {
    this.cleanUpWTSession('abort')
  }

  sendClose (): void {
    this.cleanUpWTSession('close')
  }
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (components: WebTransportSessionMultiaddrConnectionComponents, init: WebTransportSessionMultiaddrConnectionInit): MultiaddrConnection => {
  return new WebTransportSessionMultiaddrConnection(components, init)
}
