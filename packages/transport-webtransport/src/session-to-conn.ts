import { AbstractMultiaddrConnection } from '@libp2p/utils'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'
import type WebTransport from './webtransport.ts'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface WebTransportSessionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  webTransport: WebTransport
  onSessionClose?: (reason: string) => void
}

class WebTransportSessionMultiaddrConnection extends AbstractMultiaddrConnection {
  private readonly webTransport: WebTransport
  private sessionClosedByUs = false

  constructor (init: WebTransportSessionMultiaddrConnectionInit) {
    super(init)

    this.webTransport = init.webTransport

    init.webTransport.closed
      .then(() => {
        if (!this.sessionClosedByUs) {
          init.onSessionClose?.('remote_close')
        }
        this.onTransportClosed()
      })
      .catch((err: Error) => {
        this.log.error('error on remote wt session close - %e', err)
        if (!this.sessionClosedByUs) {
          init.onSessionClose?.('remote_close')
        }
        this.abort(err)
      })
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  sendReset (): void {
    this.sessionClosedByUs = true
    try {
      this.webTransport.close()
    } catch (err) {
      this.log.error('error closing wt session - %e', err)
    }
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    this.sessionClosedByUs = true
    try {
      this.webTransport.close()
    } catch (err) {
      this.log.error('error closing wt session - %e', err)
    }
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
 * Convert a WebTransport session into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (init: WebTransportSessionMultiaddrConnectionInit): MultiaddrConnection => {
  return new WebTransportSessionMultiaddrConnection(init)
}
