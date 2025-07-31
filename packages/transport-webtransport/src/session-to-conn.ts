import { AbstractMultiaddrConnection } from '@libp2p/utils'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit } from '@libp2p/utils'

export interface WebTransportSessionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  cleanUpWTSession(metric: string): void
}

class WebTransportSessionMultiaddrConnection extends AbstractMultiaddrConnection {
  private cleanUpWTSession: (metric: string) => void

  constructor (init: WebTransportSessionMultiaddrConnectionInit) {
    super(init)

    this.cleanUpWTSession = init.cleanUpWTSession
  }

  sendData (): boolean {
    return true
  }

  sendReset (): void {
    this.cleanUpWTSession('abort')
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.cleanUpWTSession('close')
    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
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
