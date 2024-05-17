/**
 * @packageDocumentation
 *
 * Configure your browser-based libp2p node with DevTools metrics:
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { devToolsMetrics } from '@libp2p/devtools-metrics'
 *
 * const node = await createLibp2p({
 *   metrics: devToolsMetrics()
 * })
 * ```
 *
 * Then use the [DevTools plugin](https://github.com/ipfs-shipyard/js-libp2p-devtools)
 * for Chrome or Firefox to inspect the state of your running node.
 */

import { start, stop } from '@libp2p/interface'
import { enable, disable } from '@libp2p/logger'
import { simpleMetrics } from '@libp2p/simple-metrics'
import { base64 } from 'multiformats/bases/base64'
import type { ComponentLogger, Connection, Libp2pEvents, Logger, Metrics, MultiaddrConnection, PeerId, PeerStore, Stream, TypedEventEmitter } from '@libp2p/interface'
import type { TransportManager, Registrar, ConnectionManager } from '@libp2p/interface-internal'

export const LIBP2P_DEVTOOLS_METRICS_INSTANCE = '________libp2p_devtools_metrics'

export interface Peer {
  /**
   * The identifier of the remote peer
   */
  peerId: string

  /**
   * The addresses we are connected to the peer via
   */
  addresses: string[]

  /**
   * The complete list of addresses the peer has, if known
   */
  multiaddrs: Array<{ isCertified?: boolean, multiaddr: string }>

  /**
   * Any peer store tags the peer has
   */
  tags: Record<string, number>

  /**
   * Any peer store tags the peer has
   */
  metadata: Record<string, string>

  /**
   * The protocols the peer supports, if known
   */
  protocols: string[]
}

export interface Status {
  peerId: string
  multiaddrs: string[]
  protocols: string[]
  peers: Peer[]
}

export interface DevToolsMetricsInit {
  /**
   * How often to pass metrics to the DevTools panel
   */
  intervalMs?: number

  /**
   * How often to update the cached list of peers
   *
   * @default 1000
   */
  peerUpdateIntervalMs?: number
}

export interface DevToolsMetricsComponents {
  logger: ComponentLogger
  events: TypedEventEmitter<Libp2pEvents>
  peerId: PeerId
  transportManager: TransportManager
  registrar: Registrar
  connectionManager: ConnectionManager
  peerStore: PeerStore
}

class DevToolsMetrics implements Metrics {
  private readonly log: Logger
  private readonly components: DevToolsMetricsComponents
  private readonly simpleMetrics: Metrics
  private readonly intervalMs?: number
  private lastMetrics?: Record<string, any>
  private lastPeers: Peer[]
  private readonly peerUpdateIntervalMs: number
  private updatePeerInterval?: ReturnType<typeof setInterval>

  constructor (components: DevToolsMetricsComponents, init?: Partial<DevToolsMetricsInit>) {
    this.log = components.logger.forComponent('libp2p:devtools-metrics')
    this.intervalMs = init?.intervalMs
    this.components = components

    // collect metrics
    this.simpleMetrics = simpleMetrics({
      intervalMs: this.intervalMs,
      onMetrics: (metrics) => {
        this.lastMetrics = metrics
      }
    })({})

    this.lastPeers = []
    this.peerUpdateIntervalMs = init?.peerUpdateIntervalMs ?? 1000

    this.updatePeers = this.updatePeers.bind(this)
  }

  trackMultiaddrConnection (maConn: MultiaddrConnection): void {
    this.simpleMetrics.trackMultiaddrConnection(maConn)
  }

  trackProtocolStream (stream: Stream, connection: Connection): void {
    this.simpleMetrics.trackProtocolStream(stream, connection)
  }

  registerMetric (name: any, options: any): any {
    return this.simpleMetrics.registerMetric(name, options)
  }

  registerMetricGroup (name: any, options: any): any {
    return this.simpleMetrics.registerMetricGroup(name, options)
  }

  registerCounter (name: any, options: any): any {
    return this.simpleMetrics.registerCounter(name, options)
  }

  registerCounterGroup (name: any, options: any): any {
    return this.simpleMetrics.registerCounterGroup(name, options)
  }

  async start (): Promise<void> {
    // send metrics
    await start(this.simpleMetrics)

    this.updatePeerInterval = setInterval(this.updatePeers, this.peerUpdateIntervalMs)

    // let devtools know we are here
    Object.defineProperty(globalThis, LIBP2P_DEVTOOLS_METRICS_INSTANCE, {
      value: this,
      enumerable: false,
      writable: true
    })
  }

  async stop (): Promise<void> {
    await stop(this.simpleMetrics)

    clearInterval(this.updatePeerInterval)

    Object.defineProperty(globalThis, LIBP2P_DEVTOOLS_METRICS_INSTANCE, {
      value: undefined,
      enumerable: false,
      writable: true
    })
  }

  getStatus (): Status {
    return {
      peerId: this.components.peerId.toString(),
      multiaddrs: this.components.transportManager.getListeners().flatMap(listener => listener.getAddrs()).map(ma => ma.toString()),
      protocols: this.components.registrar.getProtocols(),
      peers: this.lastPeers
    }
  }

  private updatePeers (): void {
    Promise.resolve()
      .then(async () => {
        const peers: Peer[] = []
        const connections = this.components.connectionManager.getConnectionsMap()

        for (const [peerId, conns] of connections.entries()) {
          try {
            const peer = await this.components.peerStore.get(peerId)

            peers.push({
              peerId: peerId.toString(),
              addresses: conns.map(conn => conn.remoteAddr.toString()),
              multiaddrs: peer.addresses.map(({ isCertified, multiaddr }) => ({ isCertified, multiaddr: multiaddr.toString() })),
              protocols: [...peer.protocols],
              tags: toObject(peer.tags, (t) => t.value),
              metadata: toObject(peer.metadata, (buf) => base64.encode(buf))
            })
          } catch (err) {
            this.log.error('could not load peer data from peer store', err)

            peers.push({
              peerId: peerId.toString(),
              addresses: conns.map(conn => conn.remoteAddr.toString()),
              multiaddrs: [],
              protocols: [],
              tags: {},
              metadata: {}
            })
          }
        }

        this.lastPeers = peers
      })
      .catch(err => {
        this.log.error('error updating peers', err)
      })
  }

  getMetrics (): Record<string, any> {
    return this.lastMetrics ?? {}
  }

  setDebug (namespace: string = ''): void {
    if (namespace.length > 0) {
      enable(namespace)
    } else {
      disable()
    }
  }
}

export function devToolsMetrics (init?: Partial<DevToolsMetricsInit>): (components: DevToolsMetricsComponents) => Metrics {
  return (components) => {
    return new DevToolsMetrics(components, init)
  }
}

function toObject <T, R> (map: Map<string, T>, transform: (value: T) => R): Record<string, R> {
  const output: Record<string, any> = {}

  for (const [key, value] of map.entries()) {
    output[key] = transform(value)
  }

  return output
}
