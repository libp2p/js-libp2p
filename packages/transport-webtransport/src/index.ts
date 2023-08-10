import { noise } from '@chainsafe/libp2p-noise'
import { type Transport, symbol, type CreateListenerOptions, type DialOptions, type Listener } from '@libp2p/interface/transport'
import { logger } from '@libp2p/logger'
import { type Multiaddr, type AbortOptions } from '@multiformats/multiaddr'
import { webtransportBiDiStreamToStream } from './stream.js'
import { inertDuplex } from './utils/inert-duplex.js'
import { isSubset } from './utils/is-subset.js'
import { parseMultiaddr } from './utils/parse-multiaddr.js'
import type { Connection, MultiaddrConnection, Stream } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { StreamMuxerFactory, StreamMuxerInit, StreamMuxer } from '@libp2p/interface/stream-muxer'
import type { Source } from 'it-stream-types'
import type { MultihashDigest } from 'multiformats/hashes/interface'

declare global {
  var WebTransport: any
}

const log = logger('libp2p:webtransport')

export interface WebTransportInit {
  maxInboundStreams?: number
}

export interface WebTransportComponents {
  peerId: PeerId
}

class WebTransportTransport implements Transport {
  private readonly components: WebTransportComponents
  private readonly config: Required<WebTransportInit>

  constructor (components: WebTransportComponents, init: WebTransportInit = {}) {
    this.components = components
    this.config = {
      maxInboundStreams: init.maxInboundStreams ?? 1000
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/webtransport'

  readonly [symbol] = true

  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    log('dialing %s', ma)
    const localPeer = this.components.peerId
    if (localPeer === undefined) {
      throw new Error('Need a local peerid')
    }

    options = options ?? {}

    const { url, certhashes, remotePeer } = parseMultiaddr(ma)

    if (certhashes.length === 0) {
      throw new Error('Expected multiaddr to contain certhashes')
    }

    const wt = new WebTransport(`${url}/.well-known/libp2p-webtransport?type=noise`, {
      serverCertificateHashes: certhashes.map(certhash => ({
        algorithm: 'sha-256',
        value: certhash.digest
      }))
    })
    wt.closed.catch((error: Error) => {
      log.error('WebTransport transport closed due to:', error)
    })
    await wt.ready

    if (remotePeer == null) {
      throw new Error('Need a target peerid')
    }

    if (!await this.authenticateWebTransport(wt, localPeer, remotePeer, certhashes)) {
      throw new Error('Failed to authenticate webtransport')
    }

    const maConn: MultiaddrConnection = {
      close: async (options?: AbortOptions) => {
        log('Closing webtransport')
        await wt.close()
      },
      abort: (err: Error) => {
        log('Aborting webtransport with err:', err)
        wt.close()
      },
      remoteAddr: ma,
      timeline: {
        open: Date.now()
      },
      // This connection is never used directly since webtransport supports native streams.
      ...inertDuplex()
    }

    wt.closed.catch((err: Error) => {
      log.error('WebTransport connection closed:', err)
      // This is how we specify the connection is closed and shouldn't be used.
      maConn.timeline.close = Date.now()
    })

    try {
      options?.signal?.throwIfAborted()
    } catch (e) {
      wt.close()
      throw e
    }

    return options.upgrader.upgradeOutbound(maConn, { skipEncryption: true, muxerFactory: this.webtransportMuxer(wt), skipProtection: true })
  }

  async authenticateWebTransport (wt: InstanceType<typeof WebTransport>, localPeer: PeerId, remotePeer: PeerId, certhashes: Array<MultihashDigest<number>>): Promise<boolean> {
    const stream = await wt.createBidirectionalStream()
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()
    await writer.ready

    const duplex = {
      source: (async function * () {
        while (true) {
          const val = await reader.read()

          if (val.value != null) {
            yield val.value
          }

          if (val.done === true) {
            break
          }
        }
      })(),
      sink: async function (source: Source<Uint8Array>) {
        for await (const chunk of source) {
          await writer.write(chunk)
        }
      }
    }

    const n = noise()()

    const { remoteExtensions } = await n.secureOutbound(localPeer, duplex, remotePeer)

    // We're done with this authentication stream
    writer.close().catch((err: Error) => {
      log.error(`Failed to close authentication stream writer: ${err.message}`)
    })

    reader.cancel().catch((err: Error) => {
      log.error(`Failed to close authentication stream reader: ${err.message}`)
    })

    // Verify the certhashes we used when dialing are a subset of the certhashes relayed by the remote peer
    if (!isSubset(remoteExtensions?.webtransportCerthashes ?? [], certhashes.map(ch => ch.bytes))) {
      throw new Error("Our certhashes are not a subset of the remote's reported certhashes")
    }

    return true
  }

  webtransportMuxer (wt: InstanceType<typeof WebTransport>): StreamMuxerFactory {
    let streamIDCounter = 0
    const config = this.config
    return {
      protocol: 'webtransport',
      createStreamMuxer: (init?: StreamMuxerInit): StreamMuxer => {
        // !TODO handle abort signal when WebTransport supports this.

        if (typeof init === 'function') {
          // The api docs say that init may be a function
          init = { onIncomingStream: init }
        }

        const activeStreams: Stream[] = [];

        (async function () {
          //! TODO unclear how to add backpressure here?

          const reader = wt.incomingBidirectionalStreams.getReader()
          while (true) {
            const { done, value: wtStream } = await reader.read()

            if (done === true) {
              break
            }

            if (activeStreams.length >= config.maxInboundStreams) {
              // We've reached our limit, close this stream.
              wtStream.writable.close().catch((err: Error) => {
                log.error(`Failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
              wtStream.readable.cancel().catch((err: Error) => {
                log.error(`Failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
            } else {
              const stream = await webtransportBiDiStreamToStream(wtStream, String(streamIDCounter++), 'inbound', activeStreams, init?.onStreamEnd)
              activeStreams.push(stream)
              init?.onIncomingStream?.(stream)
            }
          }
        })().catch(() => {
          log.error('WebTransport failed to receive incoming stream')
        })

        const muxer: StreamMuxer = {
          protocol: 'webtransport',
          streams: activeStreams,
          newStream: async (name?: string): Promise<Stream> => {
            const wtStream = await wt.createBidirectionalStream()

            const stream = await webtransportBiDiStreamToStream(wtStream, String(streamIDCounter++), init?.direction ?? 'outbound', activeStreams, init?.onStreamEnd)
            activeStreams.push(stream)

            return stream
          },

          /**
           * Close or abort all tracked streams and stop the muxer
           */
          close: async (options?: AbortOptions) => {
            log('Closing webtransport muxer')
            await wt.close()
          },
          abort: (err: Error) => {
            log('Aborting webtransport muxer with err:', err)
            wt.close()
          },
          // This stream muxer is webtransport native. Therefore it doesn't plug in with any other duplex.
          ...inertDuplex()
        }

        return muxer
      }
    }
  }

  createListener (options: CreateListenerOptions): Listener {
    throw new Error('Webtransport servers are not supported in Node or the browser')
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid webtransport addresses.
   */
  filter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(ma => ma.protoNames().includes('webtransport'))
  }
}

export function webTransport (init: WebTransportInit = {}): (components: WebTransportComponents) => Transport {
  return (components: WebTransportComponents) => new WebTransportTransport(components, init)
}
