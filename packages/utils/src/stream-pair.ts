import { pEvent } from 'p-event'
import { mockMuxer } from './mock-muxer.ts'
import { multiaddrConnectionPair } from './multiaddr-connection-pair.ts'
import { echo } from './stream-utils.ts'
import type { MockMultiaddrConnectionInit } from './multiaddr-connection-pair.ts'
import type { Stream, StreamOptions } from '@libp2p/interface'

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

  /**
   * Configuration options for the outbound stream
   */
  outbound?: StreamOptions

  /**
   * Configuration options for underlying outbound connection
   */
  outboundConnection?: Partial<MockMultiaddrConnectionInit>

  /**
   * Configuration options for the inbound stream
   */
  inbound?: StreamOptions

  /**
   * Configuration options for underlying inbound connection
   */
  inboundConnection?: Partial<MockMultiaddrConnectionInit>
}

/**
 * Returns two streams connected to each other with a slight delay in sending
 * messages to simulate a network
 */
export async function streamPair (opts: StreamPairOptions = {}): Promise<[Stream, Stream]> {
  const [outboundConnection, inboundConnection] = multiaddrConnectionPair({
    ...opts,
    outbound: opts.outboundConnection,
    inbound: opts.inboundConnection
  })

  const localMuxer = mockMuxer({
    streamOptions: opts.outbound
  }).createStreamMuxer(outboundConnection)
  const remoteMuxer = mockMuxer({
    streamOptions: opts.inbound
  }).createStreamMuxer(inboundConnection)

  const [
    inboundStream,
    outboundStream
  ] = await Promise.all([
    pEvent<'stream', CustomEvent<Stream>>(remoteMuxer, 'stream').then(evt => {
      return evt.detail
    }),
    localMuxer.createStream({
      ...opts.outbound,
      protocol: opts.protocol
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
