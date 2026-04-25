import * as crypto from 'node:crypto'
import * as os from 'node:os'
import { setMaxListeners, TypedEventEmitter } from '@libp2p/interface'
import { generateCertificate, verifyPeerCertificate } from '@libp2p/tls/utils'
import { getNetConfig } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import * as net from 'node:quic'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { quicMuxer } from './muxer.ts'
import { toMultiaddrConnection } from './session-to-conn.ts'
import { getRemoteCertificate } from './utils/get-remote-certificate.ts'
import type { Upgrader, Listener, ListenerEvents, CreateListenerOptions, ComponentLogger, Metrics, Logger, MetricGroup, CounterGroup, PrivateKey } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { QuicEndpoint, QuicSession } from 'node:quic'

const networks = os.networkInterfaces()

function isAnyAddr (ip: string): boolean {
  return ['0.0.0.0', '::'].includes(ip)
}

function getNetworkAddrs (family: string): string[] {
  const addresses: string[] = []

  for (const [, netAddrs] of Object.entries(networks)) {
    if (netAddrs != null) {
      for (const netAddr of netAddrs) {
        if (netAddr.family === family) {
          addresses.push(netAddr.address)
        }
      }
    }
  }

  return addresses
}

const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

export interface QUICListenerComponents {
  privateKey: PrivateKey
  metrics?: Metrics
}

export interface QUICListenerInit extends CreateListenerOptions {
  upgrader: Upgrader
  socketInactivityTimeout?: number
  socketCloseTimeout?: number
  maxConnections?: number
  maxInboundStreams?: number
  metrics?: Metrics
  logger: ComponentLogger
}

export interface QUICListenerMetrics {
  status?: MetricGroup
  errors?: CounterGroup
  events?: CounterGroup
}

export class QUICListener extends TypedEventEmitter<ListenerEvents> implements Listener {
  private endpoint?: QuicEndpoint
  private readonly upgrader: Upgrader
  private readonly sessions: Set<QuicSession>
  private readonly components: QUICListenerComponents
  private readonly log: Logger
  private readonly logger: ComponentLogger
  private readonly maxInboundStreams: number
  private readonly socketInactivityTimeout: number
  private readonly socketCloseTimeout: number
  private readonly metrics: QUICListenerMetrics
  private addr?: string
  private readonly shutdownController: AbortController

  constructor (components: QUICListenerComponents, init: QUICListenerInit) {
    super()

    this.components = components
    this.upgrader = init.upgrader
    this.sessions = new Set()
    this.log = init.logger.forComponent('libp2p:quic:listener')
    this.logger = init.logger
    this.maxInboundStreams = init.maxInboundStreams ?? 1000
    this.socketInactivityTimeout = init.socketInactivityTimeout ?? 5000
    this.socketCloseTimeout = init.socketCloseTimeout ?? 5000

    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)

    init.metrics?.registerMetricGroup('libp2p_quic_inbound_sessions_total', {
      label: 'address',
      help: 'Current active sessions in QUIC listener',
      calculate: () => {
        if (this.addr == null) {
          return {}
        }

        return {
          [this.addr]: this.sessions.size
        }
      }
    })

    this.metrics = {
      status: init.metrics?.registerMetricGroup('libp2p_quic_listener_status_info', {
        label: 'address',
        help: 'Current status of the QUIC listener socket'
      }),
      errors: init.metrics?.registerMetricGroup('libp2p_quic_listener_errors_total', {
        label: 'address',
        help: 'Total count of QUIC listener errors by type'
      }),
      events: init.metrics?.registerMetricGroup('libp2p_quic_listener_events_total', {
        label: 'address',
        help: 'Total count of QUIC listener events by type'
      })
    }
  }

  async onSession (session: QuicSession): Promise<void> {
    try {
      // TODO: incoming dial timeout
      const cert = await getRemoteCertificate(session, {
        signal: this.shutdownController.signal
      })

      // read one stream to do authentication
      this.log('secure inbound stream')
      const remotePeer = await verifyPeerCertificate(cert, undefined, this.log)
      this.shutdownController.signal?.throwIfAborted()

      this.log('incoming peer %p', remotePeer)

      const path = session.path

      if (path == null) {
        throw new Error('Session did not have path')
      }

      // upgrade it
      const maConn = toMultiaddrConnection(session, {
        remoteAddr: multiaddr(`/ip${path.remote.family === 'ipv4' ? '4' : '6'}/${path.remote.address}/udp/${path.remote.port}/quic-v1`),
        log: this.log,
        inactivityTimeout: this.socketInactivityTimeout,
        closeTimeout: this.socketCloseTimeout,
        metrics: this.metrics?.events,
        metricPrefix: `${this.addr} `,
        logger: this.logger,
        direction: 'inbound'
      })

      this.log('upgrading inbound connection')
      await this.upgrader.upgradeInbound(maConn, {
        skipEncryption: true,
        skipProtection: true,
        remotePeer,
        signal: this.shutdownController.signal,
        muxerFactory: quicMuxer(session, this.logger, {
          maxInboundStreams: this.maxInboundStreams
        })
      })

      this.log('inbound connection upgrade complete')
      // TODO: remove from sessions set
      this.sessions.add(session)
    } catch (err: any) {
      this.log('inbound connection failed to upgrade - %e', err)
      try {
        // @ts-expect-error not in types
        await session.close({
          type: 'application',
          reason: err.message
        })
      } catch (err) {
        session.destroy(err)
      }
    }
  }

  getAddrs (): Multiaddr[] {
    if (this.endpoint == null) {
      return []
    }

    const address = this.endpoint.address

    if (address == null) {
      return []
    }

    const proto = address.family === 'ipv4' ? 'ip4' : 'ip6'
    const toMa = (ip: string): Multiaddr => multiaddr(`/${proto}/${ip}/udp/${address.port}/quic-v1`)

    return (isAnyAddr(address.address) ? getNetworkAddrs(ProtoFamily[proto]) : [address.address]).map(toMa)
  }

  updateAnnounceAddrs (addrs: Multiaddr[]): void {

  }

  async listen (ma: Multiaddr): Promise<void> {
    if (this.endpoint?.address != null) {
      return
    }

    const netConfig = getNetConfig(ma)
    const pem = await generateCertificate(this.components.privateKey)
    this.shutdownController.signal.throwIfAborted()

    try {
      this.endpoint = await net.listen(this.onSession.bind(this), {
        // @ts-expect-error types are wrong
        sni: {
          '*': {
            certs: uint8ArrayFromString(pem.cert),
            keys: crypto.createPrivateKey(pem.key)
          }
        },
        endpoint: {
          address: `${netConfig.host}:${netConfig.port}`
        },
        alpn: 'libp2p',
        verifyClient: true,
        rejectUnauthorized: false
      })
      this.shutdownController.signal.throwIfAborted()
    } catch (err: any) {
      this.metrics.errors?.increment({ [`${this.addr} listen_error`]: true })
      this.safeDispatchEvent('error', { detail: err })

      throw err
    }

    const address = this.endpoint.address

    if (address != null) {
      this.addr = `${address.address}:${address.port}`
    }

    this.endpoint.closed
      .then(() => {
        this.safeDispatchEvent('close')
      })
      .catch(err => {
        this.metrics.errors?.increment({ [`${this.addr} close_error`]: true })
        this.safeDispatchEvent('error', { detail: err })
      })

    this.safeDispatchEvent('listening')

    this.log('listening on %s', this.addr)
  }

  async close (): Promise<void> {
    // TODO: this leaves sessions open until they time out thought the docs say
    // they should be closed immediately
    this.endpoint?.destroy?.()
      // @ts-expect-error endpoint.destroy returns a promise - https://github.com/jasnell/node/blob/bbd0da0ae8862a882144dbcb6efa115b1068223c/lib/internal/quic/quic.js#L3740
      .catch(() => {})

    // stop any in-progress connection upgrades
    this.shutdownController.abort()
  }
}
