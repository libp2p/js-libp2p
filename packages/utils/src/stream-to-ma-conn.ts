import type { AbortOptions, ComponentLogger } from '@libp2p/interface'
import type { MultiaddrConnection, Stream } from '@libp2p/interface/connection'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface StreamProperties {
  stream: Stream
  remoteAddr: Multiaddr
  localAddr: Multiaddr
  logger: ComponentLogger
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (props: StreamProperties): MultiaddrConnection {
  const { stream, remoteAddr, logger } = props
  const { sink, source } = stream
  const log = logger.forComponent('libp2p:stream:converter')

  let closedRead = false
  let closedWrite = false

  const mapSource = (async function * () {
    try {
      for await (const list of source) {
        if (list instanceof Uint8Array) {
          yield list
        } else {
          yield * list
        }
      }
    } finally {
      closedRead = true
      close()
    }
  }())

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
      } finally {
        closedWrite = true
        close()
      }
    },
    source: mapSource,
    remoteAddr,
    timeline: { open: Date.now(), close: undefined },
    async close (options?: AbortOptions) {
      close(true)
      await stream.close(options)
    },
    abort (err: Error): void {
      close(true)
      stream.abort(err)
    }
  }

  function close (force?: boolean): void {
    if (force === true) {
      closedRead = true
      closedWrite = true
    }

    if (closedRead && closedWrite && maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }

  return maConn
}
