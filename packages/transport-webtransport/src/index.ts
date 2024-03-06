/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebTransport](https://www.w3.org/TR/webtransport/).
 *
 * >
 * > ⚠️ **Note**
 * >
 * > This WebTransport implementation currently only allows dialing to other nodes. It does not yet allow listening for incoming dials. This feature requires QUIC support to land in Node JS first.
 * >
 * > QUIC support in Node JS is actively being worked on. You can keep an eye on the progress by watching the [related issues on the Node JS issue tracker](https://github.com/nodejs/node/labels/quic)
 * >
 *
 * @example
 *
 * ```TypeScript
 * import { createLibp2p } from 'libp2p'
 * import { webTransport } from '@libp2p/webtransport'
 * import { noise } from '@chainsafe/libp2p-noise'
 *
 * const node = await createLibp2p({
 *   transports: [
 *     webTransport()
 *   ],
 *   connectionEncryption: [
 *     noise()
 *   ]
 * })
 * ```
 */

import { noise } from '@chainsafe/libp2p-noise'
import { type Transport, transportSymbol, type CreateListenerOptions, type DialOptions, type Listener, type ComponentLogger, type Logger, type Connection, type MultiaddrConnection, type Stream, type CounterGroup, type Metrics, type PeerId, type StreamMuxerFactory, type StreamMuxerInit, type StreamMuxer } from '@libp2p/interface'
import { type Multiaddr, type AbortOptions } from '@multiformats/multiaddr'
import { WebTransport as WebTransportMatcher } from '@multiformats/multiaddr-matcher'
import { webtransportBiDiStreamToStream } from './stream.js'
import { inertDuplex } from './utils/inert-duplex.js'
import { isSubset } from './utils/is-subset.js'
import { parseMultiaddr } from './utils/parse-multiaddr.js'
import type { Source } from 'it-stream-types'
import type { MultihashDigest } from 'multiformats/hashes/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

interface WebTransportSessionCleanup {
  (metric: string): void
}

export interface WebTransportInit {
  maxInboundStreams?: number
}

export interface WebTransportComponents {
  peerId: PeerId
  metrics?: Metrics
  logger: ComponentLogger
}

export interface WebTransportMetrics {
  dialerEvents: CounterGroup
}

class WebTransportTransport implements Transport {
  private readonly log: Logger
  private readonly components: WebTransportComponents
  private readonly config: Required<WebTransportInit>
  private readonly metrics?: WebTransportMetrics

  constructor (components: WebTransportComponents, init: WebTransportInit = {}) {
    this.log = components.logger.forComponent('libp2p:webtransport')
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

  readonly [transportSymbol] = true

  async dial (ma: Multiaddr, options: DialOptions): Promise<Connection> {
    options?.signal?.throwIfAborted()

    this.log('dialing %s', ma)
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

    let cleanUpWTSession: WebTransportSessionCleanup = () => {}

    let closed = false
    let ready = false
    let authenticated = false

    try {
      this.metrics?.dialerEvents.increment({ pending: true })

      const wt = new WebTransport(`${url}/.well-known/libp2p-webtransport?type=noise`, {
        serverCertificateHashes: certhashes.map(certhash => ({
          algorithm: 'sha-256',
          value: certhash.digest
        }))
      })

      cleanUpWTSession = (metric: string) => {
        if (closed) {
          // already closed session
          return
        }

        try {
          this.metrics?.dialerEvents.increment({ [metric]: true })
          wt.close()
        } catch (err) {
          this.log.error('error closing wt session', err)
        } finally {
          // This is how we specify the connection is closed and shouldn't be used.
          if (maConn != null) {
            maConn.timeline.close = Date.now()
          }

          closed = true
        }
      }

      // if the dial is aborted before we are ready, close the WebTransport session
      abortListener = () => {
        if (ready) {
          cleanUpWTSession('noise_timeout')
        } else {
          cleanUpWTSession('ready_timeout')
        }
      }
      options.signal?.addEventListener('abort', abortListener, {
        once: true
      })

      await Promise.race([
        wt.closed,
        wt.ready
      ])

      ready = true
      this.metrics?.dialerEvents.increment({ ready: true })

      // this promise resolves/throws when the session is closed
      wt.closed.catch((err: Error) => {
        this.log.error('error on remote wt session close', err)
      })
        .finally(() => {
          cleanUpWTSession('remote_close')
        })

      if (!await this.authenticateWebTransport(wt, localPeer, remotePeer, certhashes)) {
        throw new Error('Failed to authenticate webtransport')
      }

      this.metrics?.dialerEvents.increment({ open: true })

      maConn = {
        close: async () => {
          this.log('Closing webtransport')
          cleanUpWTSession('close')
        },
        abort: (err: Error) => {
          this.log('aborting webtransport due to passed err', err)
          cleanUpWTSession('abort')
        },
        remoteAddr: ma,
        timeline: {
          open: Date.now()
        },
        log: this.components.logger.forComponent('libp2p:webtransport:maconn'),
        // This connection is never used directly since webtransport supports native streams.
        ...inertDuplex()
      }

      authenticated = true

      return await options.upgrader.upgradeOutbound(maConn, { skipEncryption: true, muxerFactory: this.webtransportMuxer(wt), skipProtection: true })
    } catch (err: any) {
      this.log.error('caught wt session err', err)

      if (authenticated) {
        cleanUpWTSession('upgrade_error')
      } else if (ready) {
        cleanUpWTSession('noise_error')
      } else {
        cleanUpWTSession('ready_error')
      }

      throw err
    } finally {
      if (abortListener != null) {
        options.signal?.removeEventListener('abort', abortListener)
      }
    }
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

          if (val.done) {
            break
          }
        }
      })(),
      sink: async function (source: Source<Uint8Array | Uint8ArrayList>) {
        for await (const chunk of source) {
          if (chunk instanceof Uint8Array) {
            await writer.write(chunk)
          } else {
            await writer.write(chunk.subarray())
          }
        }
      }
    }

    const n = noise()(this.components)

    const { remoteExtensions } = await n.secureOutbound(localPeer, duplex, remotePeer)

    // We're done with this authentication stream
    writer.close().catch((err: Error) => {
      this.log.error(`Failed to close authentication stream writer: ${err.message}`)
    })

    reader.cancel().catch((err: Error) => {
      this.log.error(`Failed to close authentication stream reader: ${err.message}`)
    })

    // Verify the certhashes we used when dialing are a subset of the certhashes relayed by the remote peer
    if (!isSubset(remoteExtensions?.webtransportCerthashes ?? [], certhashes.map(ch => ch.bytes))) {
      throw new Error("Our certhashes are not a subset of the remote's reported certhashes")
    }

    return true
  }

  webtransportMuxer (wt: WebTransport): StreamMuxerFactory {
    let streamIDCounter = 0
    const config = this.config
    const self = this
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
                self.log.error(`Failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
              wtStream.readable.cancel().catch((err: Error) => {
                self.log.error(`Failed to close inbound stream that crossed our maxInboundStream limit: ${err.message}`)
              })
            } else {
              const stream = await webtransportBiDiStreamToStream(
                wtStream,
                String(streamIDCounter++),
                'inbound',
                activeStreams,
                init?.onStreamEnd,
                self.components.logger
              )
              activeStreams.push(stream)
              init?.onIncomingStream?.(stream)
            }
          }
        })().catch(() => {
          this.log.error('WebTransport failed to receive incoming stream')
        })

        const muxer: StreamMuxer = {
          protocol: 'webtransport',
          streams: activeStreams,
          newStream: async (name?: string): Promise<Stream> => {
            const wtStream = await wt.createBidirectionalStream()

            const stream = await webtransportBiDiStreamToStream(
              wtStream,
              String(streamIDCounter++),
              init?.direction ?? 'outbound',
              activeStreams,
              init?.onStreamEnd,
              self.components.logger
            )
            activeStreams.push(stream)

            return stream
          },

          /**
           * Close or abort all tracked streams and stop the muxer
           */
          close: async (options?: AbortOptions) => {
            this.log('Closing webtransport muxer')

            await Promise.all(
              activeStreams.map(async s => s.close(options))
            )
          },
          abort: (err: Error) => {
            this.log('Aborting webtransport muxer with err:', err)

            for (const stream of activeStreams) {
              stream.abort(err)
            }
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
    return multiaddrs.filter(WebTransportMatcher.exactMatch)
  }
}

export function webTransport (init: WebTransportInit = {}): (components: WebTransportComponents) => Transport {
  return (components: WebTransportComponents) => new WebTransportTransport(components, init)
}
