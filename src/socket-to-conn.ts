import { abortableSource } from 'abortable-iterator'
import { CLOSE_TIMEOUT } from './constants.js'
import pTimeout from 'p-timeout'
import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interfaces'
import type { MultiaddrConnection } from '@libp2p/interfaces/transport'
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

    async close () {
      const start = Date.now()

      try {
        await pTimeout(stream.close(), CLOSE_TIMEOUT)
      } catch (err) {
        const { host, port } = maConn.remoteAddr.toOptions()
        log('timeout closing stream to %s:%s after %dms, destroying it manually',
          host, port, Date.now() - start)

        stream.destroy()
      } finally {
        maConn.timeline.close = Date.now()
      }
    }
  }

  stream.socket.once != null && stream.socket.once('close', () => { // eslint-disable-line @typescript-eslint/prefer-optional-chain
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}
