import { anySignal } from 'any-signal'
import { streamToDuplex } from './stream/stream-to-duplex'
import type { MultiaddrConnection, Stream } from '@libp2p/interface/connection'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface StreamOptions {
  signal?: AbortSignal

}

export interface StreamProperties {
  stream: Stream
  remoteAddr: Multiaddr
  localAddr: Multiaddr
}

/**
 * Convert a Stream into a MultiaddrConnection.
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export function streamToMaConnection (props: StreamProperties, options: StreamOptions = {}): MultiaddrConnection {
  const { stream, remoteAddr } = props
  const controller = new AbortController()
  const signal = anySignal([controller.signal, options.signal])

  signal.addEventListener('abort', () => {
    stream.abort(new Error('Stream was aborted'))
  })

  const maConn: MultiaddrConnection = {
    ...streamToDuplex(stream),
    remoteAddr,
    timeline: { open: Date.now() },
    async close () {
      await props.stream.close()
      setTimeoutClose()
    },
    abort (err: Error) {
      controller.abort(err)
      setTimeoutClose()
    }
  }

  function setTimeoutClose (): void {
    if (maConn.timeline.close == null) {
      maConn.timeline.close = Date.now()
    }
  }

  return maConn
}
