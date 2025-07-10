import forEach from 'it-foreach'
import { pipe } from 'it-pipe'
import type { Logger, MultiaddrConnection, Stream } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface StreamProperties {
  stream: Stream
  remoteAddr: Multiaddr
  localAddr: Multiaddr
  log: Logger

  /**
   * A callback invoked when data is read from the stream
   */
  onDataRead?(buf: Uint8ArrayList | Uint8Array): void

  /**
   * A callback invoked when data is written to the stream
   */
  onDataWrite?(buf: Uint8ArrayList | Uint8Array): void
}

/**
 * Convert a duplex iterable into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (props: StreamProperties): MultiaddrConnection {
  const { stream, remoteAddr, log, onDataRead, onDataWrite } = props

  let closedRead = false
  let closedWrite = false

  // piggyback on `stream.close` invocations to close multiaddr connection
  const streamClose = stream.close.bind(stream)
  stream.close = async (options): Promise<void> => {
    await streamClose(options)
    close(true)
  }

  // piggyback on `stream.abort` invocations to close multiaddr connection
  const streamAbort = stream.abort.bind(stream)
  stream.abort = (err): void => {
    streamAbort(err)
    close(true)
  }

  // piggyback on `stream.sink` invocations to close multiaddr connection
  const streamSink = stream.sink.bind(stream)
  stream.sink = async (source): Promise<void> => {
    try {
      await streamSink(
        pipe(
          source,
          (source) => forEach(source, buf => onDataWrite?.(buf))
        )
      )
    } catch (err: any) {
      maConn.log.error('errored - %e', err)

      // If aborted we can safely ignore
      if (err.type !== 'aborted') {
        // If the source errored the socket will already have been destroyed by
        // toIterable.duplex(). If the socket errored it will already be
        // destroyed. There's nothing to do here except log the error & return.
        maConn.log.error('%s error in sink - %e', remoteAddr, err)
      }
    } finally {
      closedWrite = true
      close()
    }
  }

  const maConn: MultiaddrConnection = {
    log: log.newScope('stream-to-maconn'),
    sink: stream.sink,
    source: (async function * (): AsyncGenerator<Uint8ArrayList> {
      try {
        for await (const buf of stream.source) {
          onDataRead?.(buf)
          yield buf
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
