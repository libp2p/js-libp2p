import { webtransportBiDiStreamToStream } from './stream.js'
import { inertDuplex } from './utils/inert-duplex.js'
import type WebTransport from './webtransport.js'
import type { ComponentLogger, Stream, StreamMuxer, StreamMuxerFactory, StreamMuxerInit } from '@libp2p/interface'

export interface WebTransportMuxerInit {
  maxInboundStreams: number
}

export function webtransportMuxer (wt: Pick<WebTransport, 'close' | 'createBidirectionalStream'>, reader: ReadableStreamDefaultReader<WebTransportBidirectionalStream>, logger: ComponentLogger, config: WebTransportMuxerInit): StreamMuxerFactory {
  let streamIDCounter = 0
  const log = logger.forComponent('libp2p:webtransport:muxer')

  return {
    protocol: 'webtransport',
    createStreamMuxer: (init?: StreamMuxerInit): StreamMuxer => {
      // !TODO handle abort signal when WebTransport supports this.

      if (typeof init === 'function') {
        // The api docs say that init may be a function
        init = { onIncomingStream: init }
      }

      const activeStreams: Stream[] = []

      Promise.resolve()
        .then(async () => {
          //! TODO unclear how to add backpressure here?
          while (true) {
            const { done, value: wtStream } = await reader.read()

            if (done) {
              break
            }

            if (activeStreams.length >= config.maxInboundStreams) {
              log(`too many inbound streams open - ${activeStreams.length}/${config.maxInboundStreams}, closing new incoming stream`)
              // We've reached our limit, close this stream.
              wtStream.writable.close().catch((err: Error) => {
                log.error(`failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
              wtStream.readable.cancel().catch((err: Error) => {
                log.error(`failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
            } else {
              const stream = await webtransportBiDiStreamToStream(
                wtStream,
                String(streamIDCounter++),
                'inbound',
                activeStreams,
                init?.onStreamEnd,
                logger
              )
              activeStreams.push(stream)
              init?.onIncomingStream?.(stream)
            }
          }
        })
        .catch(err => {
          log.error('could not create a new stream', err)
        })

      const muxer: StreamMuxer = {
        protocol: 'webtransport',
        streams: activeStreams,
        newStream: async (name?: string): Promise<Stream> => {
          log('new outgoing stream', name)

          const wtStream = await wt.createBidirectionalStream()
          const stream = await webtransportBiDiStreamToStream(wtStream, String(streamIDCounter++), init?.direction ?? 'outbound', activeStreams, init?.onStreamEnd, logger)
          activeStreams.push(stream)

          return stream
        },

        /**
         * Close all tracked streams and stop the muxer
         */
        close: async () => {
          log('closing webtransport muxer gracefully')

          try {
            wt.close()
          } catch (err: any) {
            muxer.abort(err)
          }
        },

        /**
         * Abort all tracked streams and stop the muxer
         */
        abort: (err: Error) => {
          log('closing webtransport muxer with err:', err)

          try {
            wt.close()
          } catch (err: any) {
            log.error('webtransport session threw error during close', err)
          }
        },

        // This stream muxer is webtransport native. Therefore it doesn't plug in with any other duplex.
        ...inertDuplex()
      }

      return muxer
    }
  }
}
