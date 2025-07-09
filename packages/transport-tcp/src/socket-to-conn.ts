import { InvalidParametersError, TimeoutError } from '@libp2p/interface'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import pDefer from 'p-defer'
import { raceEvent } from 'race-event'
import { duplex } from 'stream-to-it'
import { CLOSE_TIMEOUT, SOCKET_TIMEOUT } from './constants.js'
import { multiaddrToNetConfig } from './utils.js'
import type { ComponentLogger, MultiaddrConnection, CounterGroup } from '@libp2p/interface'
import type { AbortOptions, Multiaddr } from '@multiformats/multiaddr'
import type { Socket } from 'net'
import type { DeferredPromise } from 'p-defer'

interface ToConnectionOptions {
  listeningAddr?: Multiaddr
  remoteAddr?: Multiaddr
  localAddr?: Multiaddr
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  metrics?: CounterGroup
  metricPrefix?: string
  logger: ComponentLogger
  direction: 'inbound' | 'outbound'
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (socket: Socket, options: ToConnectionOptions): MultiaddrConnection => {
  let closePromise: DeferredPromise<void>
  const direction = options.direction
  const metrics = options.metrics
  const metricPrefix = options.metricPrefix ?? ''
  const inactivityTimeout = options.socketInactivityTimeout ?? SOCKET_TIMEOUT
  const closeTimeout = options.socketCloseTimeout ?? CLOSE_TIMEOUT
  let timedOut = false
  let errored = false

  // Check if we are connected on a unix path
  if (options.listeningAddr?.getPath() != null) {
    options.remoteAddr = options.listeningAddr
  }

  if (options.remoteAddr?.getPath() != null) {
    options.localAddr = options.remoteAddr
  }

  // handle socket errors
  socket.on('error', err => {
    errored = true

    if (!timedOut) {
      maConn.log.error('%s socket error - %e', direction, err)
      metrics?.increment({ [`${metricPrefix}error`]: true })
    }

    socket.destroy()
    maConn.timeline.close = Date.now()
  })

  let remoteAddr: Multiaddr

  if (options.remoteAddr != null) {
    remoteAddr = options.remoteAddr
  } else {
    if (socket.remoteAddress == null || socket.remotePort == null) {
      // this can be undefined if the socket is destroyed (for example, if the client disconnected)
      // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketremoteaddress
      throw new InvalidParametersError('Could not determine remote address or port')
    }

    remoteAddr = toMultiaddr(socket.remoteAddress, socket.remotePort)
  }

  const lOpts = multiaddrToNetConfig(remoteAddr)
  const lOptsStr = lOpts.path ?? `${lOpts.host ?? ''}:${lOpts.port ?? ''}`
  const { sink, source } = duplex(socket)

  // by default there is no timeout
  // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#socketsettimeouttimeout-callback
  socket.setTimeout(inactivityTimeout)

  socket.once('timeout', () => {
    timedOut = true
    maConn.log('%s %s socket read timeout', direction, lOptsStr)
    metrics?.increment({ [`${metricPrefix}timeout`]: true })

    // if the socket times out due to inactivity we must manually close the connection
    // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-timeout
    socket.destroy(new TimeoutError())
    maConn.timeline.close = Date.now()
  })

  socket.once('close', () => {
    // record metric for clean exit
    if (!timedOut && !errored) {
      maConn.log('%s %s socket close', direction, lOptsStr)
      metrics?.increment({ [`${metricPrefix}close`]: true })
    }

    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    socket.destroy()
    maConn.timeline.close = Date.now()
  })

  socket.once('end', () => {
    // the remote sent a FIN packet which means no more data will be sent
    // https://nodejs.org/dist/latest-v16.x/docs/api/net.html#event-end
    maConn.log('%s %s socket end', direction, lOptsStr)
    metrics?.increment({ [`${metricPrefix}end`]: true })
  })

  const maConn: MultiaddrConnection = {
    async sink (source) {
      try {
        await sink((async function * () {
          for await (const buf of source) {
            if (buf instanceof Uint8Array) {
              yield buf
            } else {
              yield buf.subarray()
            }
          }
        })())
      } catch (err: any) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          maConn.log.error('%s %s error in sink - %e', direction, lOptsStr, err)
        }
      }

      // we have finished writing, send the FIN message
      socket.end()
    },

    source,

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr,

    timeline: { open: Date.now() },

    async close (options: AbortOptions = {}) {
      if (socket.closed) {
        maConn.log('the %s %s socket is already closed', direction, lOptsStr)
        return
      }

      if (socket.destroyed) {
        maConn.log('the %s %s socket is already destroyed', direction, lOptsStr)
        return
      }

      if (closePromise != null) {
        return closePromise.promise
      }

      try {
        closePromise = pDefer()

        // close writable end of socket
        socket.end()

        // convert EventEmitter to EventTarget
        const eventTarget = socketToEventTarget(socket)

        // don't wait forever to close
        const signal = options.signal ?? AbortSignal.timeout(closeTimeout)

        // wait for any unsent data to be sent
        if (socket.writableLength > 0) {
          maConn.log('%s %s draining socket', direction, lOptsStr)
          await raceEvent(eventTarget, 'drain', signal, {
            errorEvent: 'error'
          })
          maConn.log('%s %s socket drained', direction, lOptsStr)
        }

        await Promise.all([
          raceEvent(eventTarget, 'close', signal, {
            errorEvent: 'error'
          }),

          // all bytes have been sent we can destroy the socket
          socket.destroy()
        ])
      } catch (err: any) {
        this.abort(err)
      } finally {
        closePromise.resolve()
      }
    },

    abort: (err: Error) => {
      maConn.log('%s %s socket abort due to error - %e', direction, lOptsStr, err)

      // the abortSignalListener may already destroyed the socket with an error
      socket.destroy()

      // closing a socket is always asynchronous (must wait for "close" event)
      // but the tests expect this to be a synchronous operation so we have to
      // set the close time here. the tests should be refactored to reflect
      // reality.
      maConn.timeline.close = Date.now()
    },

    log: options.logger.forComponent('libp2p:tcp:connection')
  }

  return maConn
}

function socketToEventTarget (obj?: any): EventTarget {
  const eventTarget = {
    addEventListener: (type: any, cb: any) => {
      obj.addListener(type, cb)
    },
    removeEventListener: (type: any, cb: any) => {
      obj.removeListener(type, cb)
    }
  }

  // @ts-expect-error partial implementation
  return eventTarget
}
