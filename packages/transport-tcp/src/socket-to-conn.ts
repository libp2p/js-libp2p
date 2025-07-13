import { InvalidParametersError, TimeoutError } from '@libp2p/interface'
import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import { ipPortToMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { Unix } from '@multiformats/multiaddr-matcher'
import { raceEvent } from 'race-event'
import { raceSignal } from 'race-signal'
import { Uint8ArrayList } from 'uint8arraylist'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket } from 'net'

export interface TCPSocketMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface TCPSocketMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream' | 'remoteAddr'> {
  socket: Socket
  remoteAddr?: Multiaddr
}

class TCPSocketMultiaddrConnection extends AbstractMultiaddrConnection {
  private socket: Socket

  constructor (components: TCPSocketMultiaddrConnectionComponents, init: TCPSocketMultiaddrConnectionInit) {
    let remoteAddr = init.remoteAddr

    // check if we are connected on a unix path
    if (init.localAddr != null && Unix.matches(init.localAddr)) {
      remoteAddr = init.localAddr
    } else if (remoteAddr == null) {
      if (init.socket.remoteAddress == null || init.socket.remotePort == null) {
        // this can be undefined if the socket is destroyed (for example, if the client disconnected)
        // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketremoteaddress
        throw new InvalidParametersError('Could not determine remote address or port')
      }

      remoteAddr = ipPortToMultiaddr(init.socket.remoteAddress, init.socket.remotePort)
    }

    super(components, {
      ...init,
      name: 'tcp',
      remoteAddr
    })

    this.socket = init.socket

    // handle incoming data
    this.socket.on('data', buf => {
      this.sourcePush(buf)
    })

    // handle socket errors
    this.socket.on('error', err => {
      this.abort(err)
    })

    // by default there is no timeout
    // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketsettimeouttimeout-callback
    this.socket.setTimeout(init.inactivityTimeout ?? (2 * 60 * 1_000))

    this.socket.once('timeout', () => {
      // if the socket times out due to inactivity we must manually close the connection
      // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-timeout
      this.abort(new TimeoutError())
    })

    this.socket.once('close', () => {
      if (this.socket.readable === false) {
        this.remoteCloseRead()
      }

      if (this.socket.writable === false) {
        this.remoteCloseWrite()
      }
    })

    this.socket.once('end', () => {
      // the remote sent a FIN packet which means no more data will be sent
      // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-end
      this.remoteCloseWrite()
    })
  }

  async sendData (data: Uint8ArrayList, options?: AbortOptions): Promise<void> {
    for (const buf of data) {
      await new Promise<void>((resolve, reject) => {
        this.socket.write(buf, (err) => {
          if (err != null) {
            reject(err)
            return
          }

          resolve()
        })
      })
    }
  }

  sendReset (): void {
    this.socket.resetAndDestroy()
  }

  async sendClose (options?: AbortOptions): Promise<void> {

  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    if (this.socket.destroyed === true) {
      return
    }

    this.socket.destroySoon()
    await raceEvent(this.socket, 'close', options?.signal)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    if (this.socket.readable === false) {
      return
    }

    await raceSignal(
      new Promise<void>(resolve => {
        this.socket.end(() => {
          resolve()
        })
      }),
      options?.signal
    )
  }
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (components: TCPSocketMultiaddrConnectionComponents, init: TCPSocketMultiaddrConnectionInit): MultiaddrConnection => {
  return new TCPSocketMultiaddrConnection(components, init)
}
