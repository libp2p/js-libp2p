import * as crypto from 'node:crypto'
import { serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { generateCertificate, verifyPeerCertificate } from '@libp2p/tls/utils'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { QUIC_V1 } from '@multiformats/multiaddr-matcher'
import net from 'node:quic'
import { CustomProgressEvent } from 'progress-events'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { QUICListener } from './listener.ts'
import { quicMuxer } from './muxer.ts'
import { toMultiaddrConnection } from './session-to-conn.ts'
import { getRemoteCertificate } from './utils/get-remote-certificate.ts'
import type { QUICComponents, QUICCreateListenerOptions, QUICDialEvents, QUICDialOptions, QUICMetrics, QUICOptions } from './index.ts'
import type { Logger, Connection, Transport, Listener, MultiaddrConnection, PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class QUIC implements Transport<QUICDialEvents> {
  private readonly opts: QUICOptions
  private readonly metrics?: QUICMetrics
  private readonly components: QUICComponents
  private readonly log: Logger

  constructor (components: QUICComponents, options: QUICOptions = {}) {
    this.log = components.logger.forComponent('libp2p:quic')
    this.opts = options
    this.components = components

    if (components.metrics != null) {
      this.metrics = {
        events: components.metrics.registerCounterGroup('libp2p_quic_dialer_events_total', {
          label: 'event',
          help: 'Total count of TCP dialer events by type'
        }),
        errors: components.metrics.registerCounterGroup('libp2p_quic_dialer_errors_total', {
          label: 'event',
          help: 'Total count of TCP dialer events by type'
        })
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/quic'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async dial (ma: Multiaddr, options: QUICDialOptions): Promise<Connection> {
    options.signal?.throwIfAborted()
    options.keepAlive = options.keepAlive ?? true
    options.noDelay = options.noDelay ?? true
    options.onProgress?.(new CustomProgressEvent('quic:open-connection'))

    const config = getNetConfig(ma)
    const pem = await generateCertificate(this.components.privateKey)

    let addr = `${config.host}:${config.port}`

    if (config.type === 'ip6') {
      addr = `[${config.host}]:${config.port}`
    }

    this.log('dialing %s', addr)
    const session = await net.connect(addr, {
      alpn: 'libp2p',
      certs: uint8ArrayFromString(pem.cert),
      keys: crypto.createPrivateKey(pem.key)
      // endpoint: // TODO: pass listen endpoint to multiplex to single port
    })

    const cert = await getRemoteCertificate(session, options)

    let remotePeer: PeerId

    try {
      let expectedPeer: PeerId | undefined
      const maPeerString = ma.getComponents().findLast(c => c.name === 'p2p')?.value

      if (maPeerString != null) {
        expectedPeer = peerIdFromString(maPeerString)
      }

      this.log('secure outbound stream %p', expectedPeer)
      remotePeer = await verifyPeerCertificate(cert, expectedPeer)
    } catch (err) {
      this.metrics?.errors.increment({ outbound_verify_peer: true })
      session.destroy(err)
      throw err
    }

    let maConn: MultiaddrConnection

    try {
      const path = session.path

      if (path == null) {
        throw new Error('Session did not have path')
      }

      maConn = toMultiaddrConnection(session, {
        remoteAddr: multiaddr(`/ip${path.remote.family === 'ipv4' ? '4' : '6'}/${path.remote.address}/udp/${path.remote.port}/quic-v1`),
        localAddr: multiaddr(`/ip${path.local.family === 'ipv4' ? '4' : '6'}/${path.local.address}/udp/${path.local.port}/quic-v1`),
        inactivityTimeout: this.opts.outboundSocketInactivityTimeout,
        closeTimeout: this.opts.socketCloseTimeout,
        metrics: this.metrics?.events,
        logger: this.components.logger,
        log: this.log,
        direction: 'outbound'
      })
    } catch (err: any) {
      this.metrics?.errors.increment({ outbound_to_connection: true })
      session.destroy(err)
      throw err
    }

    try {
      this.log('new outbound connection %s to %p', maConn.remoteAddr, remotePeer)
      return await options.upgrader.upgradeOutbound(maConn, {
        ...options,
        skipProtection: true,
        skipEncryption: true,
        remotePeer,
        muxerFactory: quicMuxer(session, this.components.logger, {
          maxOutboundStreams: this.opts.maxOutboundStreams
        })
      })
    } catch (err: any) {
      this.metrics?.errors.increment({ outbound_upgrade: true })
      this.log.error('error upgrading outbound connection', err)
      maConn.abort(err)
      throw err
    }
  }

  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   */
  createListener (options: QUICCreateListenerOptions): Listener {
    return new QUICListener(this.components, {
      ...(this.opts.listenOpts ?? {}),
      ...options,
      maxConnections: this.opts.maxConnections,
      socketInactivityTimeout: this.opts.inboundSocketInactivityTimeout,
      socketCloseTimeout: this.opts.socketCloseTimeout,
      metrics: this.components.metrics,
      logger: this.components.logger
    })
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid QUIC addresses
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter(ma => QUIC_V1.exactMatch(ma))
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }
}
