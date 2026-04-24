import { AbstractMultiaddrConnection } from '@libp2p/utils'
import { raceSignal } from 'race-signal'
import type { AbortOptions, ComponentLogger, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'
import type { QuicSession } from 'node:quic'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface QUICSessionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream'> {
  closeTimeout?: number
  logger: ComponentLogger
  direction: 'inbound' | 'outbound'
}

class QUICSessionMultiaddrConnection extends AbstractMultiaddrConnection {
  private session: QuicSession

  constructor (session: QuicSession, init: QUICSessionMultiaddrConnectionInit) {
    super(init)

    this.session = session
    /*
    // @ts-expect-error not in types
    this.session.onerror = (err) => {
      this.log.error('QUIC onerror - %e', err)
      this.abort(err)
    }
*/
    // @ts-expect-error not in types
    this.session.onearlyrejected = (err) => {
      this.log.error('QUIC onearlyrejected - %e', err)
      this.onRemoteReset()
    }

    // @ts-expect-error not in types
    this.session.ongoaway = (err) => {
      this.log.error('QUIC ongoaway - %e', err)
      this.onTransportClosed()
    }

    // @ts-expect-error not in types
    session.opened.then(() => {
      this.log('QUIC session opened')
    }, (err: Error) => {
      this.log('QUIC session failed to open - %e', err)
      this.onTransportClosed()
    })

    session.closed.then(() => {
      this.log('QUIC session closed gracefully')
    }, (err: Error) => {
      this.log.error('QUIC session closed with error - %e', err)
      this.abort(err)
    }).finally(() => {
      this.log('QUIC session closed')
      this.onTransportClosed()
      // This is how we specify the connection is closed and shouldn't be used.
      this.timeline.close = Date.now()
    })
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  sendReset (): void {
    this.session.destroy()
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    await raceSignal(this.session.close(), options?.signal)
  }

  sendPause (): void {
    // TODO: backpressure?
  }

  sendResume (): void {
    // TODO: backpressure?
  }
}

/**
 * Convert a QUIC session into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (session: QuicSession, init: QUICSessionMultiaddrConnectionInit): MultiaddrConnection => {
  return new QUICSessionMultiaddrConnection(session, init)
}
