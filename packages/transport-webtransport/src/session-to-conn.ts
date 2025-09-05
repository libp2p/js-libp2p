import { AbstractMultiaddrConnection } from '@libp2p/utils'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface WebTransportSessionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  cleanUpWTSession(metric: string): void
}

class WebTransportSessionMultiaddrConnection extends AbstractMultiaddrConnection {
  private cleanUpWTSession: (metric: string) => void

  constructor (init: WebTransportSessionMultiaddrConnectionInit) {
    super(init)

    this.cleanUpWTSession = init.cleanUpWTSession
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  sendReset (): void {
    this.cleanUpWTSession('abort')
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    this.cleanUpWTSession('close')
    options?.signal?.throwIfAborted()
  }

  sendPause (): void {
    // TODO: backpressure?
  }

  sendResume (): void {
    // TODO: backpressure?
  }
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (init: WebTransportSessionMultiaddrConnectionInit): MultiaddrConnection => {
  return new WebTransportSessionMultiaddrConnection(init)
}
