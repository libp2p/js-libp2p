import { abortableSource } from 'abortable-iterator'
import debug from 'debug'
import type { MuxedStream } from '@libp2p/interfaces/stream-muxer'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MultiaddrConnection } from '@libp2p/interfaces/transport'

const log = debug('libp2p:stream:converter')

/**
 * @typedef {Object} Timeline
 * @property {number} open -
 * @property {number} [upgraded] - .
 * @property {number} [close]
 */

export interface Timeline {
  /**
   * Connection opening timestamp
   */
  open: number

  /**
   * Connection upgraded timestamp
   */
  upgraded?: number

  /**
   * Connection closed timestamp
   */
  close?: number
}

interface StreamOptions {
  signal?: AbortSignal

}

interface StreamProperties {
  stream: MuxedStream
  remoteAddr: Multiaddr
  localAddr: Multiaddr
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (props: StreamProperties, options: StreamOptions = {}) {
  const { stream, remoteAddr, localAddr } = props
  const { sink, source } = stream
  const maConn: MultiaddrConnection = {
    async sink (source) {
      if (options.signal != null) {
        source = abortableSource(source, options.signal)
      }

      try {
        await sink(source)
        await close()
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
    source: (options.signal != null) ? abortableSource(source, options.signal) : source,
    conn: stream,
    localAddr,
    remoteAddr,
    /** @type {Timeline} */
    timeline: { open: Date.now(), close: undefined },
    async close () {
      await sink(async function * () {
        yield new Uint8Array(0)
      }())
      await close()
    }
  }

  async function close () {
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
    return await Promise.resolve()
  }

  return maConn
}
