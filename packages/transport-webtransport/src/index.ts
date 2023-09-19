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
import type { CounterGroup, Metrics } from '@libp2p/interface/metrics'

interface WebTransportSessionCleanup {
  (closeInfo?: WebTransportCloseInfo): void
}

const log = logger('libp2p:webtransport')

export interface WebTransportInit {
  maxInboundStreams?: number
}

export interface WebTransportComponents {
  peerId: PeerId
  metrics?: Metrics
}

export interface WebTransportMetrics {
  dialerEvents: CounterGroup
}

class WebTransportTransport implements Transport {
  private readonly components: WebTransportComponents
  private readonly config: Required<WebTransportInit>
  private readonly metrics?: WebTransportMetrics

  constructor (components: WebTransportComponents, init: WebTransportInit = {}) {
    this.components = components
    this.config = {
      maxInboundStreams: init.maxInboundStreams ?? 1000
    }

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_webtransport_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebTransport dialer events by type'
        })
      }
    }
  }

  readonly [Symbol.toStringTag] = '@libp2p/webtransport'

  readonly [symbol] = true

  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    options?.signal?.throwIfAborted()

    log('dialing %s', ma)
    const localPeer = this.components.peerId
    if (localPeer === undefined) {
      throw new Error('Need a local peerid')
    }

    options = options ?? {}

    const { url, certhashes, remotePeer } = parseMultiaddr(ma)

    if (remotePeer == null) {
      throw new Error('Need a target peerid')
    }

    if (certhashes.length === 0) {
      throw new Error('Expected multiaddr to contain certhashes')
    }

    let abortListener: (() => void) | undefined
    let maConn: MultiaddrConnection | undefined

    let cleanUpWTSession: () => void = () => {}

    try {
      let closed = false
      this.metrics?.dialerEvents.increment({ open: true })
      const wt = new WebTransport(`${url}/.well-known/libp2p-webtransport?type=noise`, {
        serverCertificateHashes: certhashes.map(certhash => ({
          algorithm: 'sha-256',
          value: certhash.digest
        }))
      })

      cleanUpWTSession = () => {
        try {
          if (maConn != null) {
            if (maConn.timeline.close != null) {
              // already closed session
              return
            }

            // This is how we specify the connection is closed and shouldn't be used.
            maConn.timeline.close = Date.now()
          }

          if (closed) {
            // already closed session
            return
          }

          this.metrics?.dialerEvents.increment({ close: true })
          wt.close()
        } catch (err) {
          log.error('error closing wt session', err)
        } finally {
          closed = true
        }
      }

      // if the dial is aborted before we are ready, close the WebTransport session
      abortListener = () => {
        this.metrics?.dialerEvents.increment({ abort: true })
        cleanUpWTSession()
      }
      options.signal?.addEventListener('abort', abortListener, {
        once: true
      })

      await Promise.race([
        wt.closed,
        wt.ready
      ])

      this.metrics?.dialerEvents.increment({ ready: true })

      // this promise resolves/throws when the session is closed
      wt.closed
        .then(async () => {
          await maConn?.close()
        })
        .catch((err: Error) => {
          log.error('error on remote wt session close', err)
          maConn?.abort(err)
        })
        .finally(() => {
          cleanUpWTSession()
        })

      if (!await this.authenticateWebTransport(wt, localPeer, remotePeer, certhashes, options)) {
        throw new Error('Failed to authenticate webtransport')
      }

      maConn = {
        close: async () => {
          log('Closing webtransport')
          cleanUpWTSession()
        },
        abort: (err: Error) => {
          log('aborting webtransport due to passed err', err)
          cleanUpWTSession()
        },
        remoteAddr: ma,
        timeline: {
          open: Date.now()
        },
        // This connection is never used directly since webtransport supports native streams.
        ...inertDuplex()
      }

      options?.signal?.throwIfAborted()

      return await options.upgrader.upgradeOutbound(maConn, { skipEncryption: true, muxerFactory: this.webtransportMuxer(wt, cleanUpWTSession), skipProtection: true })
    } catch (err: any) {
      log.error('caught wt session err', err)

      this.metrics?.dialerEvents.increment({ error: true })
      cleanUpWTSession()

      throw err
    } finally {
      if (abortListener != null) {
        options.signal?.removeEventListener('abort', abortListener)
      }
    }
  }

  async authenticateWebTransport (wt: InstanceType<typeof WebTransport>, localPeer: PeerId, remotePeer: PeerId, certhashes: Array<MultihashDigest<number>>, options: DialOptions): Promise<boolean> {
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

          if (val.done) {
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

  webtransportMuxer (wt: WebTransport, cleanUpWTSession: WebTransportSessionCleanup): StreamMuxerFactory {
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

            if (done) {
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
            cleanUpWTSession()
          },
          abort: (err: Error) => {
            log('Aborting webtransport muxer with err:', err)
            cleanUpWTSession({
              closeCode: 0,
              reason: err.message
            })
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
