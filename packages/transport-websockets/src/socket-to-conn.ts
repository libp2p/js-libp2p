import { AbortError, ConnectionFailedError } from '@libp2p/interface'
import { CLOSE_TIMEOUT } from './constants.js'
import type { AbortOptions, ComponentLogger, CounterGroup, MultiaddrConnection } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { DuplexWebSocket } from 'it-ws/duplex'

export interface SocketToConnOptions {
  localAddr?: Multiaddr
  logger: ComponentLogger
  metrics?: CounterGroup
  metricPrefix?: string
}

// Convert a stream into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
export function socketToMaConn (stream: DuplexWebSocket, remoteAddr: Multiaddr, options: SocketToConnOptions): MultiaddrConnection {
  const metrics = options.metrics
  const metricPrefix = options.metricPrefix ?? ''

  const maConn: MultiaddrConnection = {
    log: options.logger.forComponent('libp2p:websockets:connection'),

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
          maConn.log.error(err)
        }
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
        maConn.log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        this.abort(new AbortError('Socket close timeout'))
      }

      options.signal?.addEventListener('abort', listener)

      try {
        await stream.close()
      } catch (err: any) {
        maConn.log.error('error closing WebSocket gracefully - %e', err)
        this.abort(err)
      } finally {
        options.signal?.removeEventListener('abort', listener)
        maConn.timeline.close = Date.now()
      }
    },

    abort (err: Error): void {
      maConn.log.error('destroying WebSocket after error - %e', err)
      stream.destroy()
      maConn.timeline.close = Date.now()

      // ws WebSocket.terminate does not accept an Error arg to emit an 'error'
      // event on destroy like other node streams so we can't update a metric
      // with an event listener
      // https://github.com/websockets/ws/issues/1752#issuecomment-622380981
      metrics?.increment({ [`${metricPrefix}error`]: true })
    }
  }

  // track local vs remote closing
  let closedLocally = false
  const close = stream.socket.close.bind(stream.socket)
  stream.socket.close = (...args) => {
    closedLocally = true
    return close(...args)
  }

  stream.socket.addEventListener('close', (evt) => {
    maConn.log('closed %s, code %d, reason "%s", wasClean %s', closedLocally ? 'locally' : 'by remote', evt.code, evt.reason, evt.wasClean)

    if (!evt.wasClean) {
      maConn.abort(new ConnectionFailedError(`${closedLocally ? 'Local' : 'Remote'} did not close WebSocket cleanly`))
      return
    }

    metrics?.increment({ [`${metricPrefix}close`]: true })
    maConn.timeline.close = Date.now()
  }, { once: true })

  return maConn
}
