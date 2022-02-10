import { abortableSource } from 'abortable-iterator'
import { logger } from '@libp2p/logger'
// @ts-expect-error no types
import toIterable from 'stream-to-it'
import { ipPortToMultiaddr as toMultiaddr } from '@libp2p/utils/ip-port-to-multiaddr'
import { CLOSE_TIMEOUT } from './constants.js'
import type { Socket } from 'net'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MultiaddrConnection } from '@libp2p/interfaces/transport'

const log = logger('libp2p:tcp:socket')

interface ToConnectionOptions {
  listeningAddr?: Multiaddr
  remoteAddr?: Multiaddr
  localAddr?: Multiaddr
  signal?: AbortSignal
}

/**
 * Convert a socket into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (socket: Socket, options?: ToConnectionOptions) => {
  options = options ?? {}

  // Check if we are connected on a unix path
  if (options.listeningAddr?.getPath() != null) {
    options.remoteAddr = options.listeningAddr
  }

  if (options.remoteAddr?.getPath() != null) {
    options.localAddr = options.remoteAddr
  }

  const { sink, source } = toIterable.duplex(socket)

  const maConn: MultiaddrConnection = {
    async sink (source) {
      if ((options?.signal) != null) {
        source = abortableSource(source, options.signal)
      }

      try {
        await sink((async function * () {
          for await (const chunk of source) {
            // Convert BufferList to Buffer
            // Sink in StreamMuxer define argument as Uint8Array so chunk type infers as number which can't be sliced
            yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
          }
        })())
      } catch (err: any) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          log(err)
        }
      }
    },

    // Missing Type for "abortable"
    source: (options.signal != null) ? abortableSource(source, options.signal) : source,

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr ?? toMultiaddr(socket.remoteAddress ?? '', socket.remotePort ?? ''),

    timeline: { open: Date.now() },

    async close () {
      if (socket.destroyed) return

      return await new Promise((resolve, reject) => {
        const start = Date.now()

        // Attempt to end the socket. If it takes longer to close than the
        // timeout, destroy it manually.
        const timeout = setTimeout(() => {
          const { host, port } = maConn.remoteAddr.toOptions()
          log(
            'timeout closing socket to %s:%s after %dms, destroying it manually',
            host,
            port,
            Date.now() - start
          )

          if (socket.destroyed) {
            log('%s:%s is already destroyed', host, port)
          } else {
            socket.destroy()
          }

          resolve()
        }, CLOSE_TIMEOUT).unref()

        socket.once('close', () => {
          clearTimeout(timeout)
          resolve()
        })
        socket.end((err?: Error & { code?: string }) => {
          clearTimeout(timeout)
          maConn.timeline.close = Date.now()
          if (err != null) {
            return reject(err)
          }
          resolve()
        })
      })
    }
  }

  socket.once('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}
