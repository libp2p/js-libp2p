import { logger } from '@libp2p/logger'
// @ts-expect-error no types
import toIterable from 'stream-to-it'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { CLOSE_TIMEOUT, SOCKET_TIMEOUT } from './constants.js'
import { multiaddrToNetConfig } from './utils.js'
import { CodeError } from '@libp2p/interfaces/errors'
import type { Socket } from 'net'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MultiaddrConnection } from '@libp2p/interface-connection'
import type { CounterGroup } from '@libp2p/interface-metrics'

const log = logger('libp2p:tcp:socket')

interface ToConnectionOptions {
  listeningAddr?: Multiaddr
  remoteAddr?: Multiaddr
  localAddr?: Multiaddr
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  metrics?: CounterGroup
  metricPrefix?: string
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (socket: Socket, options: ToConnectionOptions): MultiaddrConnection => {
  const metrics = options.metrics
  const metricPrefix = options.metricPrefix ?? ''
  const inactivityTimeout = options.socketInactivityTimeout ?? SOCKET_TIMEOUT
  const closeTimeout = options.socketCloseTimeout ?? CLOSE_TIMEOUT

  // Check if we are connected on a unix path
  if (options.listeningAddr?.getPath() != null) {
    options.remoteAddr = options.listeningAddr
  }

  if (options.remoteAddr?.getPath() != null) {
    options.localAddr = options.remoteAddr
  }

  let remoteAddr: Multiaddr

  if (options.remoteAddr != null) {
    remoteAddr = options.remoteAddr
  } else {
    if (socket.remoteAddress == null || socket.remotePort == null) {
      // this can be undefined if the socket is destroyed (for example, if the client disconnected)
      // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketremoteaddress
      throw new CodeError('Could not determine remote address or port', 'ERR_NO_REMOTE_ADDRESS')
    }

    remoteAddr = toMultiaddr(socket.remoteAddress, socket.remotePort)
  }

  const lOpts = multiaddrToNetConfig(remoteAddr)
  const lOptsStr = lOpts.path ?? `${lOpts.host ?? ''}:${lOpts.port ?? ''}`
  const { sink, source } = toIterable.duplex(socket)

  // by default there is no timeout
  // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketsettimeouttimeout-callback
  socket.setTimeout(inactivityTimeout, () => {
    log('%s socket read timeout', lOptsStr)
    metrics?.increment({ [`${metricPrefix}timeout`]: true })

    // only destroy with an error if the remote has not sent the FIN message
    let err: Error | undefined
    if (socket.readable) {
      err = new CodeError('Socket read timeout', 'ERR_SOCKET_READ_TIMEOUT')
    }

    // if the socket times out due to inactivity we must manually close the connection
    // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-timeout
    socket.destroy(err)
  })

  socket.once('close', () => {
    log('%s socket close', lOptsStr)
    metrics?.increment({ [`${metricPrefix}close`]: true })

    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  })

  socket.once('end', () => {
    // the remote sent a FIN packet which means no more data will be sent
    // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-end
    log('%s socket end', lOptsStr)
    metrics?.increment({ [`${metricPrefix}end`]: true })
  })

  const maConn: MultiaddrConnection = {
    async sink (source) {
      try {
        await sink(source)
      } catch (err: any) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          log(err)
        }
      }

      // we have finished writing, send the FIN message
      socket.end()
    },

    source,

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr,

    timeline: { open: Date.now() },

    async close () {
      if (socket.destroyed) {
        log('%s socket was already destroyed when trying to close', lOptsStr)
        return
      }

      log('%s closing socket', lOptsStr)
      await new Promise<void>((resolve, reject) => {
        const start = Date.now()

        let timeout: NodeJS.Timeout | undefined

        socket.once('close', () => {
          log('%s socket closed', lOptsStr)
          // socket completely closed
          if (timeout !== undefined) {
            clearTimeout(timeout)
          }
          resolve()
        })
        socket.once('error', (err: Error) => {
          log('%s socket error', lOptsStr, err)

          // error closing socket
          if (maConn.timeline.close == null) {
            maConn.timeline.close = Date.now()
          }

          if (socket.destroyed) {
            if (timeout !== undefined) {
              clearTimeout(timeout)
            }
          }

          reject(err)
        })

        // shorten inactivity timeout
        socket.setTimeout(closeTimeout)

        // close writable end of the socket
        socket.end()

        if (socket.writableLength > 0) {
          // Attempt to end the socket. If it takes longer to close than the
          // timeout, destroy it manually.
          timeout = setTimeout(() => {
            if (socket.destroyed) {
              log('%s is already destroyed', lOptsStr)
              resolve()
            } else {
              log('%s socket close timeout after %dms, destroying it manually', lOptsStr, Date.now() - start)

              // will trigger 'error' and 'close' events that resolves promise
              socket.destroy(new CodeError('Socket close timeout', 'ERR_SOCKET_CLOSE_TIMEOUT'))
            }
          }, closeTimeout).unref()
          // there are outgoing bytes waiting to be sent
          socket.once('drain', () => {
            log('%s socket drained', lOptsStr)

            // all bytes have been sent we can destroy the socket (maybe) before the timeout
            socket.destroy()
          })
        } else {
          // nothing to send, destroy immediately, no need the timeout
          socket.destroy()
        }
      })
    }
  }

  return maConn
}
