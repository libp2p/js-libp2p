import type { ComponentLogger, MultiaddrConnection, Stream } from '@libp2p/interface'
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
  const log = logger.forComponent('libp2p:stream:converter')

  let closedRead = false
  let closedWrite = false

  // piggyback on `stream.close` invocations to close maconn
  const streamClose = stream.close.bind(stream)
  stream.close = async (options) => {
    await streamClose(options)
    close(true)
  }

  // piggyback on `stream.abort` invocations to close maconn
  const streamAbort = stream.abort.bind(stream)
  stream.abort = (err) => {
    streamAbort(err)
    close(true)
  }

  // piggyback on `stream.sink` invocations to close maconn
  const streamSink = stream.sink.bind(stream)
  stream.sink = async (source) => {
    try {
      await streamSink(source)
    } catch (err: any) {
      // If aborted we can safely ignore
      if (err.type !== 'aborted') {
        // If the source errored the socket will already have been destroyed by
        // toIterable.duplex(). If the socket errored it will already be
        // destroyed. There's nothing to do here except log the error & return.
        log.error('%s error in sink', remoteAddr, err)
      }
    } finally {
      closedWrite = true
      close()
    }
  }

  const maConn: MultiaddrConnection = {
    log,
    sink: stream.sink,
    source: (async function * () {
      try {
        for await (const list of stream.source) {
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
    }()),
    remoteAddr,
    timeline: { open: Date.now(), close: undefined },
    close: stream.close,
    abort: stream.abort
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
