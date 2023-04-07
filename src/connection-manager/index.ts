import { logger } from '@libp2p/logger'
import { CodeError } from '@libp2p/interfaces/errors'
import type { AbortOptions } from '@libp2p/interfaces'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import { codes } from '../errors.js'
import { isPeerId, PeerId } from '@libp2p/interface-peer-id'
import { setMaxListeners } from 'events'
import type { Connection, MultiaddrConnection } from '@libp2p/interface-connection'
import type { ConnectionManager, ConnectionManagerEvents } from '@libp2p/interface-connection-manager'
import * as STATUS from '@libp2p/interface-connection/status'
import type { AddressSorter, PeerStore } from '@libp2p/interface-peer-store'
import type { Multiaddr, MultiaddrFilter, Resolver } from '@multiformats/multiaddr'
import { KEEP_ALIVE } from '@libp2p/interface-peer-store/tags'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { Metrics } from '@libp2p/interface-metrics'
import type { TransportManager, Upgrader } from '@libp2p/interface-transport'
import { getPeerAddress } from '../get-peer.js'
import { AutoDial } from './auto-dial.js'
import { DialQueue } from './dial-queue.js'
import { ConnectionPruner } from './connection-pruner.js'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import { PeerMap } from '@libp2p/peer-collections'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { AUTO_DIAL_CONCURRENCY, AUTO_DIAL_PRIORITY, DIAL_TIMEOUT, INBOUND_CONNECTION_THRESHOLD, MAX_CONNECTIONS, MAX_INCOMING_PENDING_CONNECTIONS, MAX_PARALLEL_DIALS, MAX_PEER_ADDRS_TO_DIAL, MIN_CONNECTIONS } from './constants.js'
import { dnsaddrResolver } from '@multiformats/multiaddr/resolvers'
import type { PendingDial } from '../libp2p.js'

const log = logger('libp2p:connection-manager')

const DEFAULT_DIAL_PRIORITY = 50

export interface ConnectionManagerInit {
  /**
   * The maximum number of connections libp2p is willing to have before it starts
   * pruning connections to reduce resource usage. (default: 300)
   */
  maxConnections?: number

  /**
   * The minimum number of connections below which libp2p will start to dial peers
   * from the peer book. Setting this to 0 effectively disables this behaviour.
   * (default: 50)
   */
  minConnections?: number

  /**
   * When dialling peers from the peer book to keep the number of open connections
   * above `minConnections`, add dials for this many peers to the dial queue
   * at once. (default: 25)
   */
  autoDialConcurrency?: number

  /**
   * To allow user dials to take priority over auto dials, use this value as the
   * dial priority. (default: 0)
   */
  autoDialPriority?: number

  /**
   * Sort the known addresses of a peer before trying to dial, By default public
   * addresses will be dialled before private (e.g. loopback or LAN) addresses.
   */
  addressSorter?: AddressSorter

  /**
   * The maximum number of dials across all peers to execute in parallel.
   * (default: 100)
   */
  maxParallelDials?: number

  /**
   * To prevent individual peers with large amounts of multiaddrs swamping the
   * dial queue, this value controls how many addresses to dial in parallel per
   * peer. So for example if two peers have 10 addresses and this value is set
   * at 5, we will dial 5 addresses from each at a time. (default: 10)
   */
  maxParallelDialsPerPeer?: number

  /**
   * Maximum number of addresses allowed for a given peer - if a peer has more
   * addresses than this then the dial will fail. (default: 25)
   */
  maxPeerAddrsToDial?: number

  /**
   * How long a dial attempt is allowed to take, including DNS resolution
   * of the multiaddr, opening a socket and upgrading it to a Connection.
   */
  dialTimeout?: number

  /**
   * When a new inbound connection is opened, the upgrade process (e.g. protect,
   * encrypt, multiplex etc) must complete within this number of ms. (default: 30s)
   */
  inboundUpgradeTimeout?: number

  /**
   * Multiaddr resolvers to use when dialling
   */
  resolvers?: Record<string, Resolver>

  /**
   * A list of multiaddrs that will always be allowed (except if they are in the
   * deny list) to open connections to this node even if we've reached maxConnections
   */
  allow?: MultiaddrFilter[]

  /**
   * A list of multiaddrs that will never be allowed to open connections to
   * this node under any circumstances
   */
  deny?: MultiaddrFilter[]

  /**
   * If more than this many connections are opened per second by a single
   * host, reject subsequent connections. (default: 5)
   */
  inboundConnectionThreshold?: number

  /**
   * The maximum number of parallel incoming connections allowed that have yet to
   * complete the connection upgrade - e.g. choosing connection encryption, muxer, etc.
   * (default: 10)
   */
  maxIncomingPendingConnections?: number
}

const defaultOptions = {
  minConnections: MIN_CONNECTIONS,
  maxConnections: MAX_CONNECTIONS,
  inboundConnectionThreshold: INBOUND_CONNECTION_THRESHOLD,
  maxIncomingPendingConnections: MAX_INCOMING_PENDING_CONNECTIONS,
  autoDialConcurrency: AUTO_DIAL_CONCURRENCY,
  autoDialPriority: AUTO_DIAL_PRIORITY
}

export interface DefaultConnectionManagerComponents {
  peerId: PeerId
  metrics?: Metrics
  upgrader: Upgrader
  peerStore: PeerStore
  transportManager: TransportManager
  connectionGater: ConnectionGater
}

export interface OpenConnectionOptions extends AbortOptions {
  priority?: number
}

/**
 * Responsible for managing known connections.
 */
export class DefaultConnectionManager extends EventEmitter<ConnectionManagerEvents> implements ConnectionManager, Startable {
  private started: boolean
  private readonly connections: PeerMap<Connection[]>
  private readonly allow: MultiaddrFilter[]
  private readonly deny: MultiaddrFilter[]
  private readonly maxIncomingPendingConnections: number
  private incomingPendingConnections: number
  private readonly maxConnections: number

  public readonly dialQueue: DialQueue
  public readonly autoDial: AutoDial
  public readonly connectionPruner: ConnectionPruner
  private readonly inboundConnectionRateLimiter: RateLimiterMemory

  private readonly peerStore: PeerStore
  private readonly metrics?: Metrics

  constructor (components: DefaultConnectionManagerComponents, init: ConnectionManagerInit = {}) {
    super()

    this.maxConnections = init.maxConnections ?? defaultOptions.maxConnections
    const minConnections = init.minConnections ?? defaultOptions.minConnections

    if (this.maxConnections < minConnections) {
      throw new CodeError('Connection Manager maxConnections must be greater than minConnections', codes.ERR_INVALID_PARAMETERS)
    }

    /**
     * Map of connections per peer
     */
    this.connections = new PeerMap()

    this.started = false

    try {
      // This emitter gets listened to a lot
      setMaxListeners?.(Infinity, this)
    } catch {}

    this.peerStore = components.peerStore
    this.metrics = components.metrics

    this.onConnect = this.onConnect.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)

    // allow/deny lists
    this.allow = init.allow ?? []
    this.deny = init.deny ?? []

    this.incomingPendingConnections = 0
    this.maxIncomingPendingConnections = init.maxIncomingPendingConnections ?? defaultOptions.maxIncomingPendingConnections

    // controls individual peers trying to dial us too quickly
    this.inboundConnectionRateLimiter = new RateLimiterMemory({
      points: init.inboundConnectionThreshold ?? defaultOptions.inboundConnectionThreshold,
      duration: 1
    })

    // controls what happens when we don't have enough connections
    this.autoDial = new AutoDial({
      connectionManager: this,
      peerStore: components.peerStore
    }, {
      minConnections,
      autoDialConcurrency: init.autoDialConcurrency ?? defaultOptions.autoDialConcurrency,
      autoDialPriority: init.autoDialPriority ?? defaultOptions.autoDialPriority
    })
    // check the min connection limit whenever a peer disconnects
    this.addEventListener('peer:disconnect', () => {
      this.autoDial.autoDial()
        .catch(err => {
          log.error(err)
        })
    })

    // controls what happens when we have too many connections
    this.connectionPruner = new ConnectionPruner({
      connectionManager: this,
      peerStore: components.peerStore
    }, {
      maxConnections: this.maxConnections,
      allow: this.allow
    })
    // check the max connection limit whenever a peer connects
    this.addEventListener('peer:connect', () => {
      this.connectionPruner.maybePruneConnections()
        .catch(err => {
          log.error(err)
        })
    })

    this.dialQueue = new DialQueue({
      peerId: components.peerId,
      metrics: components.metrics,
      peerStore: components.peerStore,
      transportManager: components.transportManager,
      connectionGater: components.connectionGater
    }, {
      addressSorter: init.addressSorter ?? publicAddressesFirst,
      maxParallelDials: init.maxParallelDials ?? MAX_PARALLEL_DIALS,
      maxPeerAddrsToDial: init.maxPeerAddrsToDial ?? MAX_PEER_ADDRS_TO_DIAL,
      dialTimeout: init.dialTimeout ?? DIAL_TIMEOUT,
      resolvers: init.resolvers ?? {
        dnsaddr: dnsaddrResolver
      }
    })

    components.upgrader.addEventListener('connection', this.onConnect)
    components.upgrader.addEventListener('connectionEnd', this.onDisconnect)
  }

  isStarted (): boolean {
    return this.started
  }

  /**
   * Starts the Connection Manager. If Metrics are not enabled on libp2p
   * only event loop and connection limits will be monitored.
   */
  async start (): Promise<void> {
    // track inbound/outbound connections
    this.metrics?.registerMetricGroup('libp2p_connection_manager_connections', {
      calculate: () => {
        const metric = {
          inbound: 0,
          outbound: 0
        }

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            if (conn.stat.direction === 'inbound') {
              metric.inbound++
            } else {
              metric.outbound++
            }
          }
        }

        return metric
      }
    })

    // track total number of streams per protocol
    this.metrics?.registerMetricGroup('libp2p_protocol_streams_total', {
      label: 'protocol',
      calculate: () => {
        const metric: Record<string, number> = {}

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            for (const stream of conn.streams) {
              const key = `${stream.stat.direction} ${stream.stat.protocol ?? 'unnegotiated'}`

              metric[key] = (metric[key] ?? 0) + 1
            }
          }
        }

        return metric
      }
    })

    // track 90th percentile of streams per protocol
    this.metrics?.registerMetricGroup('libp2p_connection_manager_protocol_streams_per_connection_90th_percentile', {
      label: 'protocol',
      calculate: () => {
        const allStreams: Record<string, number[]> = {}

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            const streams: Record<string, number> = {}

            for (const stream of conn.streams) {
              const key = `${stream.stat.direction} ${stream.stat.protocol ?? 'unnegotiated'}`

              streams[key] = (streams[key] ?? 0) + 1
            }

            for (const [protocol, count] of Object.entries(streams)) {
              allStreams[protocol] = allStreams[protocol] ?? []
              allStreams[protocol].push(count)
            }
          }
        }

        const metric: Record<string, number> = {}

        for (let [protocol, counts] of Object.entries(allStreams)) {
          counts = counts.sort((a, b) => a - b)

          const index = Math.floor(counts.length * 0.9)
          metric[protocol] = counts[index]
        }

        return metric
      }
    })

    this.started = true
    log('started')
  }

  async afterStart (): Promise<void> {
    // re-connect to any peers with the KEEP_ALIVE tag
    void Promise.resolve()
      .then(async () => {
        const keepAlivePeers: PeerId[] = []

        for (const peer of await this.peerStore.all()) {
          const tags = await this.peerStore.getTags(peer.id)
          const hasKeepAlive = tags.filter(tag => tag.name === KEEP_ALIVE).length > 0

          if (hasKeepAlive) {
            keepAlivePeers.push(peer.id)
          }
        }

        await Promise.all(
          keepAlivePeers.map(async peer => {
            await this.openConnection(peer)
              .catch(err => {
                log.error(err)
              })
          })
        )
      })
      .catch(err => {
        log.error(err)
      })

    // make sure we have some peers
    this.autoDial.autoDial()
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * Stops the Connection Manager
   */
  async stop (): Promise<void> {
    this.dialQueue.cancelPendingDials()
    this.autoDial.stop()

    // Close all connections we're tracking
    const tasks: Array<Promise<void>> = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push((async () => {
          try {
            await connection.close()
          } catch (err) {
            log.error(err)
          }
        })())
      }
    }

    log('closing %d connections', tasks.length)
    await Promise.all(tasks)
    this.connections.clear()

    log('stopped')
  }

  onConnect (evt: CustomEvent<Connection>): void {
    void this._onConnect(evt).catch(err => {
      log.error(err)
    })
  }

  /**
   * Tracks the incoming connection and check the connection limit
   */
  async _onConnect (evt: CustomEvent<Connection>): Promise<void> {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      await connection.close()
      return
    }

    const peerId = connection.remotePeer
    const storedConns = this.connections.get(peerId)

    if (storedConns != null) {
      storedConns.push(connection)
    } else {
      this.connections.set(peerId, [connection])
    }

    if (peerId.publicKey != null) {
      await this.peerStore.keyBook.set(peerId, peerId.publicKey)
    }

    this.dispatchEvent(new CustomEvent<Connection>('peer:connect', { detail: connection }))
  }

  /**
   * Removes the connection from tracking
   */
  onDisconnect (evt: CustomEvent<Connection>): void {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      return
    }

    const peerId = connection.remotePeer
    let storedConn = this.connections.get(peerId)

    if (storedConn != null && storedConn.length > 1) {
      storedConn = storedConn.filter((conn) => conn.id !== connection.id)
      this.connections.set(peerId, storedConn)
    } else if (storedConn != null) {
      this.connections.delete(peerId)
      this.dispatchEvent(new CustomEvent<Connection>('peer:disconnect', { detail: connection }))
    }
  }

  getConnections (peerId?: PeerId): Connection[] {
    if (peerId != null) {
      return this.connections.get(peerId) ?? []
    }

    let conns: Connection[] = []

    for (const c of this.connections.values()) {
      conns = conns.concat(c)
    }

    return conns
  }

  getConnectionsMap (): PeerMap<Connection[]> {
    return this.connections
  }

  async openConnection (peerIdOrMultiaddr: PeerId | Multiaddr | Multiaddr[], options: OpenConnectionOptions = {}): Promise<Connection> {
    const { peerId } = getPeerAddress(peerIdOrMultiaddr)

    if (peerId != null) {
      log('dial %p', peerId)
      const existingConnections = this.getConnections(peerId)

      if (existingConnections.length > 0) {
        log('had an existing connection to %p', peerId)

        return existingConnections[0]
      }
    }

    const connection = await this.dialQueue.dial(peerIdOrMultiaddr, {
      ...options,
      priority: options.priority ?? DEFAULT_DIAL_PRIORITY
    })
    let peerConnections = this.connections.get(connection.remotePeer)

    if (peerConnections == null) {
      peerConnections = []
      this.connections.set(connection.remotePeer, peerConnections)
    }

    // we get notified of connections via the Upgrader emitting "connection"
    // events, double check we aren't already tracking this connection before
    // storing it
    let trackedConnection = false

    for (const conn of peerConnections) {
      if (conn.id === connection.id) {
        trackedConnection = true
      }
    }

    if (!trackedConnection) {
      peerConnections.push(connection)
    }

    return connection
  }

  async closeConnections (peerId: PeerId): Promise<void> {
    const connections = this.connections.get(peerId) ?? []

    await Promise.all(
      connections.map(async connection => {
        await connection.close()
      })
    )
  }

  /**
   * Get all open connections with a peer
   */
  getAll (peerId: PeerId): Connection[] {
    if (!isPeerId(peerId)) {
      throw new CodeError('peerId must be an instance of peer-id', codes.ERR_INVALID_PARAMETERS)
    }

    const connections = this.connections.get(peerId)

    // Return all open connections
    if (connections != null) {
      return connections.filter(connection => connection.stat.status === STATUS.OPEN)
    }

    return []
  }

  async acceptIncomingConnection (maConn: MultiaddrConnection): Promise<boolean> {
    // check deny list
    const denyConnection = this.deny.some(filter => {
      return filter.contains(maConn.remoteAddr)
    })

    if (denyConnection) {
      log('connection from %s refused - connection remote address was in deny list', maConn.remoteAddr)
      return false
    }

    // check allow list
    const allowConnection = this.allow.some(filter => {
      return filter.contains(maConn.remoteAddr)
    })

    if (allowConnection) {
      this.incomingPendingConnections++

      return true
    }

    // check pending connections
    if (this.incomingPendingConnections === this.maxIncomingPendingConnections) {
      log('connection from %s refused - incomingPendingConnections exceeded by peer %s', maConn.remoteAddr)
      return false
    }

    if (maConn.remoteAddr.isThinWaistAddress()) {
      const host = maConn.remoteAddr.nodeAddress().address

      try {
        await this.inboundConnectionRateLimiter.consume(host, 1)
      } catch {
        log('connection from %s refused - inboundConnectionThreshold exceeded by host %s', host, maConn.remoteAddr)
        return false
      }
    }

    if (this.getConnections().length < this.maxConnections) {
      this.incomingPendingConnections++

      return true
    }

    log('connection from %s refused - maxConnections exceeded', maConn.remoteAddr)
    return false
  }

  afterUpgradeInbound (): void {
    this.incomingPendingConnections--
  }

  getDialQueue (): PendingDial[] {
    return this.dialQueue.pendingDials
  }
}
