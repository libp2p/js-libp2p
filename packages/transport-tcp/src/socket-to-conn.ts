import { InvalidParametersError, TimeoutError } from '@libp2p/interface'
import { AbstractMultiaddrConnection, socketWriter, ipPortToMultiaddr } from '@libp2p/utils'
import { Unix } from '@multiformats/multiaddr-matcher'
import { raceEvent } from 'race-event'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult, SocketWriter } from '@libp2p/utils'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Socket } from 'net'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface TCPSocketMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'name' | 'stream' | 'remoteAddr'> {
  socket: Socket
  remoteAddr?: Multiaddr
}

class TCPSocketMultiaddrConnection extends AbstractMultiaddrConnection {
  private socket: Socket
  private writer: SocketWriter

  constructor (init: TCPSocketMultiaddrConnectionInit) {
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

    super({
      ...init,
      remoteAddr
    })

    this.socket = init.socket

    // handle incoming data
    this.socket.on('data', buf => {
      this.onData(buf)
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

    this.socket.once('end', () => {
      // the remote sent a FIN packet which means no more data will be sent
      // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-end
      this.onRemoteCloseWrite()
    })

    this.socket.once('close', hadError => {
      if (hadError) {
        this.abort(new Error('TCP transmission error'))
        return
      }

      this.onRemoteCloseWrite()
      this.onClosed()
    })

    // the socket can accept more data
    this.socket.on('drain', () => {
      this.safeDispatchEvent('drain')
    })

    this.writer = socketWriter(this.socket)
  }

  sendData (data: Uint8ArrayList): SendResult {
    let sentBytes = 0
    let canSendMore = true

    for (const buf of data) {
      sentBytes += buf.byteLength
      canSendMore = this.writer.write(buf)

      if (!canSendMore) {
         break
      }
    }

    return {
      sentBytes,
      canSendMore
    }
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    if (this.socket.destroyed) {
      return
    }

    this.socket.end()

    await raceEvent(this.socket, 'close', options?.signal)
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendReset (): void {
    this.socket.resetAndDestroy()
  }

  sendPause (): void {
    this.socket.pause()
  }

  sendResume (): void {
    this.socket.resume()
  }
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (init: TCPSocketMultiaddrConnectionInit): MultiaddrConnection => {
  return new TCPSocketMultiaddrConnection(init)
}
