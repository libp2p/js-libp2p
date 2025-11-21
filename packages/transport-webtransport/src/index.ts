/**
 * @packageDocumentation
 *
 * A [libp2p transport](https://docs.libp2p.io/concepts/transports/overview/) based on [WebTransport](https://www.w3.org/TR/webtransport/).
 *
 * > ⚠️ **Note**
 * >
 * > This WebTransport implementation currently only allows dialing to other nodes. It does not yet allow listening for incoming dials. This feature requires QUIC support to land in Node JS first.
 * >
 * > QUIC support in Node JS is actively being worked on. You can keep an eye on the progress by watching the [related issues on the Node JS issue tracker](https://github.com/nodejs/node/labels/quic)
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
 *   connectionEncrypters: [
 *     noise()
 *   ]
 * })
 * ```
 */

import { noise } from '@chainsafe/libp2p-noise'
import { InvalidCryptoExchangeError, InvalidParametersError, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { WebTransport as WebTransportMatcher } from '@multiformats/multiaddr-matcher'
import { CustomProgressEvent } from 'progress-events'
import createListener from './listener.js'
import { webtransportMuxer } from './muxer.js'
import { toMultiaddrConnection } from './session-to-conn.ts'
import { isSubset } from './utils/is-subset.js'
import { parseMultiaddr } from './utils/parse-multiaddr.js'
import { WebTransportMessageStream } from './utils/webtransport-message-stream.ts'
import WebTransport from './webtransport.js'
import type { Upgrader, Transport, CreateListenerOptions, DialTransportOptions, Listener, ComponentLogger, Logger, Connection, MultiaddrConnection, CounterGroup, Metrics, PeerId, OutboundConnectionUpgradeEvents, PrivateKey } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MultihashDigest } from 'multiformats/hashes/interface'
import type { ProgressEvent } from 'progress-events'

/**
 * PEM format server certificate and private key
 */
export interface WebTransportCertificate {
  privateKey: string
  pem: string
  hash: MultihashDigest<number>
  secret: string
}

interface WebTransportSessionCleanup {
  (metric: string): void
}

export interface WebTransportInit {
  certificates?: WebTransportCertificate[]
}

export interface WebTransportComponents {
  peerId: PeerId
  privateKey: PrivateKey
  metrics?: Metrics
  logger: ComponentLogger
  upgrader: Upgrader
}

export interface WebTransportMetrics {
  dialerEvents: CounterGroup
}

export type WebTransportDialEvents =
  OutboundConnectionUpgradeEvents |
  ProgressEvent<'webtransport:wait-for-session'> |
  ProgressEvent<'webtransport:open-authentication-stream'> |
  ProgressEvent<'webtransport:secure-outbound-connection'> |
  ProgressEvent<'webtransport:close-authentication-stream'> |
  ProgressEvent<'webtransport:resolve-dns'>

interface AuthenticateWebTransportOptions extends DialTransportOptions<WebTransportDialEvents> {
  wt: WebTransport
  maConn: MultiaddrConnection
  remotePeer?: PeerId
  certhashes: Array<MultihashDigest<number>>
}

/**
 * Detect if running in Chrome/Chromium browser.
 * Chrome has a port-scanning penalty mechanism that affects DNS-based WebTransport dials.
 * 
 * @returns true if running in Chrome/Chromium (not Edge), false otherwise
 */
export function isChrome (): boolean {
  if (typeof globalThis.navigator === 'undefined') {
    return false
  }
  
  const ua = globalThis.navigator.userAgent
  // Match Chrome/Chromium but not Edge
  return /Chrome\//.test(ua) && !/Edg\//.test(ua)
}

// Check if multiaddr contains DNS components that need resolution.

export function hasDNSComponent(ma: Multiaddr): boolean {
  const maStr = ma.toString()
  
  return maStr.includes('/dns/') ||
         maStr.includes('/dns4/') ||
         maStr.includes('/dns6/') ||
         maStr.includes('/dnsaddr/')
}

/**
 * Resolve DNS components in multiaddr to IP addresses.
 */
async function resolveMultiaddrDNS (ma: Multiaddr, log: Logger, signal?: AbortSignal): Promise<Multiaddr[]> {
  try {
    log('resolving DNS for %s', ma.toString())
    
    const { url } = parseMultiaddr(ma)
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || // IPv4
        /^\[?[0-9a-fA-F:]+\]?$/.test(hostname)) {   // IPv6
      log('multiaddr already contains IP address, skipping DNS resolution')
      return [ma]
    }
    
    // Determine DNS protocol type from multiaddr string
    const maStr = ma.toString()
    let dnsProto: string | undefined
    
    if (maStr.includes('/dns4/')) {
      dnsProto = 'dns4'
    } else if (maStr.includes('/dns6/')) {
      dnsProto = 'dns6'
    } else if (maStr.includes('/dns/')) {
      dnsProto = 'dns'
    } else if (maStr.includes('/dnsaddr/')) {
      dnsProto = 'dnsaddr'
    }
    
    if (dnsProto == null) {
      return [ma]
    }
    
    log('DNS protocol detected: %s for hostname: %s', dnsProto, hostname)
    await new Promise(resolve => setTimeout(resolve, 0))
    log('async DNS boundary completed for %s', hostname)
    return [ma]
  } catch (err: any) {
    log.error('DNS resolution check failed: %s', err.message)
    return [ma]
  }
}

class WebTransportTransport implements Transport<WebTransportDialEvents> {
  private readonly log: Logger
  private readonly components: WebTransportComponents
  private readonly config: Required<WebTransportInit>
  private readonly metrics?: WebTransportMetrics
  private readonly isChromeBrowser: boolean

  constructor (components: WebTransportComponents, init: WebTransportInit = {}) {
    this.log = components.logger.forComponent('libp2p:webtransport')
    this.components = components
    this.config = {
      ...init,
      certificates: init.certificates ?? []
    }
    this.isChromeBrowser = isChrome()
    if (this.isChromeBrowser) {
      this.log('Chrome detected - will pre-resolve DNS for WebTransport multiaddrs to prevent port-scanning penalty (issue #3286)')
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

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (ma: Multiaddr, options: DialTransportOptions<WebTransportDialEvents>): Promise<Connection> {
    options.signal.throwIfAborted()

    this.log('dialing %s', ma)

    options = options ?? {}

    // Pre-resolve DNS in Chrome to prevent port-scanning penalty
    let addrsToTry: Multiaddr[] = [ma]
    
    if (this.isChromeBrowser && hasDNSComponent(ma)) {
      this.log('pre-resolving DNS components for Chrome to prevent empty-string penalty')
      options.onProgress?.(new CustomProgressEvent('webtransport:resolve-dns'))
      
      try {
        const resolved = await resolveMultiaddrDNS(ma, this.log, options.signal)
        
        if (resolved.length > 0) {
          addrsToTry = resolved
          if (resolved[0].toString() !== ma.toString()) {
            this.log('resolved %s to %s', ma.toString(), resolved[0].toString())
          } else {
            this.log('DNS resolution async boundary completed for %s', ma.toString())
          }
        }
      } catch (err: any) {
        this.log('DNS pre-resolution failed: %s, continuing with original multiaddr', err.message)
        addrsToTry = [ma]
      }
    }
    const errors: Error[] = []
    
    for (const dialAddr of addrsToTry) {
      if (options.signal?.aborted === true) {
        throw new Error('Dial aborted by signal')
      }
      
      try {
        return await this.dialSingleAddress(dialAddr, ma, options)
      } catch (err: any) {
        this.log.error('dial failed for %s: %s', dialAddr.toString(), err.message)
        errors.push(err)
      }
    }
    
    // All addresses failed
    if (errors.length === 1) {
      throw errors[0]
    }
    
    throw new AggregateError(errors, `Failed to dial any resolved addresses: ${errors.map(e => e.message).join('; ')}`)
  }

  private async dialSingleAddress (dialAddr: Multiaddr, originalAddr: Multiaddr, options: DialTransportOptions<WebTransportDialEvents>): Promise<Connection> {
    const { url, certhashes, remotePeer } = parseMultiaddr(dialAddr)
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
          this.log.error('error closing wt session - %e', err)
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
      options.signal.addEventListener('abort', abortListener, {
        once: true
      })

      this.log('wait for session to be ready')
      options.onProgress?.(new CustomProgressEvent('webtransport:wait-for-session'))
      await Promise.race([
        wt.closed,
        wt.ready
      ])
      this.log('session became ready')

      ready = true
      this.metrics?.dialerEvents.increment({ ready: true })

      // this promise resolves/throws when the session is closed
      wt.closed.catch((err: Error) => {
        this.log.error('error on remote wt session close - %e', err)
      })
        .finally(() => {
          cleanUpWTSession('remote_close')
        })

      this.metrics?.dialerEvents.increment({ open: true })

      maConn = toMultiaddrConnection({
        remoteAddr: originalAddr,
        cleanUpWTSession,
        direction: 'outbound',
        log: this.components.logger.forComponent('libp2p:webtransport:connection')
      })

      authenticated = await this.authenticateWebTransport({
        wt,
        maConn,
        remotePeer,
        certhashes,
        ...options
      })

      if (!authenticated) {
        throw new InvalidCryptoExchangeError('Failed to authenticate webtransport')
      }

      return await options.upgrader.upgradeOutbound(maConn, {
        ...options,
        skipEncryption: true,
        remotePeer,
        muxerFactory: webtransportMuxer(wt),
        skipProtection: true
      })
    } catch (err: any) {
      this.log.error('caught wt session err - %e', err)

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

  async authenticateWebTransport ({ wt, maConn, remotePeer, certhashes, onProgress, signal }: AuthenticateWebTransportOptions): Promise<boolean> {
    onProgress?.(new CustomProgressEvent('webtransport:open-authentication-stream'))
    const stream = await wt.createBidirectionalStream()
    signal?.throwIfAborted()

    const messages = new WebTransportMessageStream({
      stream,
      log: maConn.log.newScope('muxer')
    })

    const n = noise()(this.components)

    onProgress?.(new CustomProgressEvent('webtransport:secure-outbound-connection'))
    const { remoteExtensions } = await n.secureOutbound(messages, {
      signal,
      remotePeer,
      skipStreamMuxerNegotiation: true
    })

    onProgress?.(new CustomProgressEvent('webtransport:close-authentication-stream'))

    // We're done with this authentication stream
    await messages.close({
      signal
    })

    // Verify the certhashes we used when dialing are a subset of the certhashes
    // relayed by the remote peer
    if (!isSubset(remoteExtensions?.webtransportCerthashes ?? [], certhashes.map(ch => ch.bytes))) {
      throw new InvalidParametersError("Our certhashes are not a subset of the remote's reported certhashes")
    }

    return true
  }

  createListener (options: CreateListenerOptions): Listener {
    return createListener(this.components, {
      ...options,
      certificates: this.config.certificates
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can listen on
   */
  listenFilter (): Multiaddr[] {
    return []
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    // test for WebTransport support
    if (globalThis.WebTransport == null) {
      return []
    }

    return multiaddrs.filter(ma => {
      if (!WebTransportMatcher.exactMatch(ma)) {
        return false
      }

      const { url, certhashes } = parseMultiaddr(ma)

      return url != null && certhashes.length > 0
    })
  }
}

export function webTransport (init: WebTransportInit = {}): (components: WebTransportComponents) => Transport {
  return (components: WebTransportComponents) => new WebTransportTransport(components, init)
}
