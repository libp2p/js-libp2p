import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { abortableSource } from 'abortable-iterator'
import { CLOSE_TIMEOUT } from './constants.js'
import type { AbortOptions } from '@libp2p/interface'
import type { MultiaddrConnection } from '@libp2p/interface/connection'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'

const log = logger('libp2p:websockets:socket')

export interface SocketToConnOptions extends AbortOptions {
  localAddr?: Multiaddr
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn (stream: DuplexWebSocket, remoteAddr: Multiaddr, options?: SocketToConnOptions): MultiaddrConnection {
  options = options ?? {}

  const maConn: MultiaddrConnection = {
    async sink (source) {
      if ((options?.signal) != null) {
        source = abortableSource(source, options.signal)
      }

      try {
        await stream.sink(source)
      } catch (err: any) {
        if (err.type !== 'aborted') {
          log.error(err)
        }
      }
    },

    source: (options.signal != null) ? abortableSource(stream.source, options.signal) : stream.source,

    remoteAddr,

    timeline: { open: Date.now() },

    async close (options: AbortOptions = {}) {
      const start = Date.now()
      options.signal = options.signal ?? AbortSignal.timeout(CLOSE_TIMEOUT)

      const listener = (): void => {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        this.abort(new CodeError('Socket close timeout', 'ERR_SOCKET_CLOSE_TIMEOUT'))
      }

      options.signal.addEventListener('abort', listener)

      try {
        await stream.close()
      } catch (err: any) {
        this.abort(err)
      } finally {
        options.signal.removeEventListener('abort', listener)
        maConn.timeline.close = Date.now()
      }
    },

    abort (err: Error): void {
      const { host, port } = maConn.remoteAddr.toOptions()
      log('timeout closing stream to %s:%s due to error',
        host, port, err)

      stream.destroy()
      maConn.timeline.close = Date.now()
    }
  }

  stream.socket.addEventListener('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }, { once: true })

  return maConn
}
