import { CodeError } from '@libp2p/interface'
import { CLOSE_TIMEOUT } from './constants.js'
import type { AbortOptions, ComponentLogger, CounterGroup, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'

export interface SocketToConnOptions {
  localAddr?: Multiaddr
  logger: ComponentLogger
  metrics?: CounterGroup
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn (stream: DuplexWebSocket, remoteAddr: Multiaddr, options: SocketToConnOptions): MultiaddrConnection {
  const log = options.logger.forComponent('libp2p:websockets:maconn')
  const metrics = options.metrics

  const maConn: MultiaddrConnection = {
    log,

    async sink (source) {
      try {
        await stream.sink((async function * () {
          for await (const buf of source) {
            if (buf instanceof Uint8Array) {
              yield buf
            } else {
              yield buf.subarray()
            }
          }
        })())
      } catch (err: any) {
        if (err.type !== 'aborted') {
          metrics?.increment({ maconn_sink_error: true })
          log.error(err)
        }
        metrics?.increment({ maconn_sink_abort: true })
      }
    },

    source: stream.source,

    remoteAddr,

    timeline: { open: Date.now() },

    async close (options: AbortOptions = {}) {
      const start = Date.now()

      if (options.signal == null) {
        const signal = AbortSignal.timeout(CLOSE_TIMEOUT)

        options = {
          ...options,
          signal
        }
      }

      const listener = (): void => {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)
        metrics?.increment({ maconn_close_abort: true })

        this.abort(new CodeError('Socket close timeout', 'ERR_SOCKET_CLOSE_TIMEOUT'))
      }

      options.signal?.addEventListener('abort', listener)

      try {
        await stream.close()
        metrics?.increment({ maconn_close_success: true })
      } catch (err: any) {
        log.error('error closing WebSocket gracefully', err)
        metrics?.increment({ maconn_close_error: true })
        this.abort(err)
      } finally {
        options.signal?.removeEventListener('abort', listener)
        maConn.timeline.close = Date.now()
      }
    },

    abort (err: Error): void {
      const { host, port } = maConn.remoteAddr.toOptions()
      log('timeout closing stream to %s:%s due to error',
        host, port, err)

      metrics?.increment({ maconn_abort: true })

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
    metrics?.increment({ socket_close_success: true })
  }, { once: true })

  metrics?.increment({ maconn_open_success: true })

  return maConn
}
