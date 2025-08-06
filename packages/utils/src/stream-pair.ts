import { raceEvent } from 'race-event'
import { mockMuxer } from './mock-muxer.ts'
import { multiaddrConnectionPair } from './multiaddr-connection-pair.ts'
import { echo } from './stream-utils.ts'
import type { Stream } from '@libp2p/interface'

export interface StreamPairOptions {
  /**
   * How long to wait in ms before sending messages
   *
   * @default 1
   */
  delay?: number

  /**
   * If more than this many messages are sent within delay, write backpressure
   * will be applied
   */
  capacity?: number

  /**
   * Simulate having pre-negotiated a protocol by passing it here
   */
  protocol?: string
}

/**
 * Returns two streams connected to each other with a slight delay in sending
 * messages to simulate a network
 */
export async function streamPair (opts: StreamPairOptions = {}): Promise<[Stream, Stream]> {
  const [outboundConnection, inboundConnection] = multiaddrConnectionPair(opts)

  const localMuxer = mockMuxer().createStreamMuxer(outboundConnection)
  const remoteMuxer = mockMuxer().createStreamMuxer(inboundConnection)

  const [
    outboundStream,
    inboundStream
  ] = await Promise.all([
    localMuxer.createStream({
      protocol: opts.protocol
    }),
    raceEvent<CustomEvent<Stream>>(remoteMuxer, 'stream').then(evt => {
      return evt.detail
    })
  ])

  return [
    outboundStream,
    inboundStream
  ]
}

export async function echoStream (opts: StreamPairOptions = {}): Promise<Stream> {
  const [outbound, inbound] = await streamPair(opts)
  echo(inbound)

  return outbound
}
