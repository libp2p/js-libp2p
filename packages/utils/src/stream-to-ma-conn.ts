import { logger } from '@libp2p/logger'
import type { AbortOptions } from '@libp2p/interface'
import type { MultiaddrConnection, Stream } from '@libp2p/interface/connection'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:stream:converter')

export interface StreamProperties {
  stream: Stream
  remoteAddr: Multiaddr
  localAddr: Multiaddr
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (props: StreamProperties): MultiaddrConnection {
  const { stream, remoteAddr } = props
  const { sink, source } = stream

  const mapSource = (async function * () {
    for await (const list of source) {
      if (list instanceof Uint8Array) {
        yield list
      } else {
        yield * list
      }
    }
  }())

  const maConn: MultiaddrConnection = {
    async sink (source) {
      try {
        await sink(source)
        close()
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
    source: mapSource,
    remoteAddr,
    timeline: { open: Date.now(), close: undefined },
    async close (options?: AbortOptions) {
      close()
      await stream.close(options)
    },
    abort (err: Error): void {
      close()
      stream.abort(err)
    }
  }

  function close (): void {
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }

  return maConn
}
