import { ConnectionClosedError, InvalidMultiaddrError, InvalidParametersError, InvalidPeerIdError, NotStartedError, start, stop } from '@libp2p/interface'
import { PeerMap } from '@libp2p/peer-collections'
import { RateLimiter } from '@libp2p/utils/rate-limiter'
import { multiaddr } from '@multiformats/multiaddr'
import { CustomProgressEvent } from 'progress-events'
import { getPeerAddress } from '../get-peer.js'
import { ConnectionPruner } from './connection-pruner.js'
import { DIAL_TIMEOUT, INBOUND_CONNECTION_THRESHOLD, MAX_CONNECTIONS, MAX_DIAL_QUEUE_LENGTH, MAX_INCOMING_PENDING_CONNECTIONS, MAX_PARALLEL_DIALS, MAX_PEER_ADDRS_TO_DIAL } from './constants.js'
import { DialQueue } from './dial-queue.js'
import { ReconnectQueue } from './reconnect-queue.js'
import { dnsaddrResolver } from './resolvers/index.ts'
import { multiaddrToIpNet } from './utils.js'
import type { IpNet } from '@chainsafe/netmask'
import type { PendingDial, AddressSorter, Libp2pEvents, AbortOptions, ComponentLogger, Logger, Connection, MultiaddrConnection, ConnectionGater, Metrics, PeerId, PeerStore, Startable, PendingDialStatus, PeerRouting, IsDialableOptions, MultiaddrResolver } from '@libp2p/interface'
import type { ConnectionManager, OpenConnectionOptions, TransportManager } from '@libp2p/interface-internal'
import type { JobStatus } from '@libp2p/utils/queue'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { TypedEventTarget } from 'main-event'

export const DEFAULT_DIAL_PRIORITY = 50

export interface ConnectionManagerInit {
  /**
   * The maximum number of connections libp2p is willing to have before it
   * starts pruning connections to reduce resource usage.
   *
   * @default 300/100
   */
  maxConnections?: number

  /**
   * Sort the known addresses of a peer before trying to dial, By default public
   * addresses will be dialled before private (e.g. loopback or LAN) addresses.
   */
  addressSorter?: AddressSorter

  /**
   * The maximum number of dials across all peers to execute in parallel.
   *
   * @default 100/50
   */
  maxParallelDials?: number

  /**
   * The maximum size the dial queue is allowed to grow to. Promises returned
   * when dialing peers after this limit is reached will not resolve until the
   * queue size falls beneath this size.
   *
   * @default 500
   */
  maxDialQueueLength?: number

  /**
   * Maximum number of addresses allowed for a given peer before giving up
   *
   * @default 25
   */
  maxPeerAddrsToDial?: number

  /**
   * How long a dial attempt is allowed to take, including DNS resolution
   * of the multiaddr, opening a socket and upgrading it to a Connection.
   *
   * @default 10_000
   */
  dialTimeout?: number

  /**
   * When a new incoming connection is opened, the upgrade process (e.g.
   * protect, encrypt, multiplex etc) must complete within this number of ms.
   *
   * @default 10_000
   */
  inboundUpgradeTimeout?: number

  /**
   * When a new outbound connection is opened, the upgrade process (e.g.
   * protect, encrypt, multiplex etc) must complete within this number of ms.
   *
   * Does not apply if an abort signal is passed to the `.dial` method.
   *
   * @deprecated This is handled by `dialTimeout`
   */
  outboundUpgradeTimeout?: number

  /**
   * Protocol negotiation must complete within this number of ms
   *
   * @default 2000
   * @deprecated use outboundStreamProtocolNegotiationTimeout or inboundStreamProtocolNegotiationTimeout instead
   */
  protocolNegotiationTimeout?: number

  /**
   * Outbound protocol negotiation must complete within this number of ms.
   *
   * Does not apply if an abort signal is passed to the `.dial` or
   * `.dialProtocol` method of the `ConnectionManager` or the `openStream`
   * method of the `Connection`.
   *
   * @default 10_000
   */
  outboundStreamProtocolNegotiationTimeout?: number

  /**
   * Inbound protocol negotiation must complete within this number of ms
   *
   * @default 10_000
   */
  inboundStreamProtocolNegotiationTimeout?: number

  /**
   * Multiaddr resolvers to use when dialling
   */
  resolvers?: Record<string, MultiaddrResolver>

  /**
   * A list of multiaddrs that will always be allowed (except if they are in the
   * deny list) to open connections to this node even if we've reached
   * maxConnections
   */
  allow?: string[]

  /**
   * A list of multiaddrs that will never be allowed to open connections to
   * this node under any circumstances
   */
  deny?: string[]

  /**
   * If more than this many connections are opened per second by a single
   * host, reject subsequent connections.
   *
   * @default 5
   */
  inboundConnectionThreshold?: number

  /**
   * The maximum number of parallel incoming connections allowed that have yet
   * to complete the connection upgrade - e.g. choosing connection encryption,
   * muxer, etc.
   *
   * @default 10
   */
  maxIncomingPendingConnections?: number

  /**
   * When a peer tagged with `KEEP_ALIVE` disconnects, attempt to redial them
   * this many times.
   *
   * @default 5
   */
  reconnectRetries?: number

  /**
   * When a peer tagged with `KEEP_ALIVE` disconnects, wait this long between
   * each retry. Note this will be multiplied by `reconnectFactor` to create an
   * increasing retry backoff.
   *
   * @default 1000
   */
  reconnectRetryInterval?: number

  /**
   * When a peer tagged with `KEEP_ALIVE` disconnects, apply this multiplication
   * factor to the time interval between each retry.
   *
   * @default 2
   */
  reconnectBackoffFactor?: number

  /**
   * When a peers tagged with `KEEP_ALIVE` disconnect, reconnect to this many at
   * once.
   *
   * @default 5
   */
  maxParallelReconnects?: number
}

const defaultOptions = {
  maxConnections: MAX_CONNECTIONS,
  inboundConnectionThreshold: INBOUND_CONNECTION_THRESHOLD,
  maxIncomingPendingConnections: MAX_INCOMING_PENDING_CONNECTIONS
}

export interface DefaultConnectionManagerComponents {
  peerId: PeerId
  metrics?: Metrics
  peerStore: PeerStore
  peerRouting: PeerRouting
  transportManager: TransportManager
  connectionGater: ConnectionGater
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

/**
 * Responsible for managing known connections.
 */
export class DefaultConnectionManager implements ConnectionManager, Startable {
  private started: boolean
  private readonly connections: PeerMap<Connection[]>
  private readonly allow: IpNet[]
  private readonly deny: IpNet[]
  private readonly maxIncomingPendingConnections: number
  private incomingPendingConnections: number
  private outboundPendingConnections: number
  private maxConnections: number

  public readonly dialQueue: DialQueue
  public readonly reconnectQueue: ReconnectQueue
  public readonly connectionPruner: ConnectionPruner
  private readonly inboundConnectionRateLimiter: RateLimiter
  private readonly peerStore: PeerStore
  private readonly metrics?: Metrics
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly log: Logger
  private readonly peerId: PeerId

  constructor (components: DefaultConnectionManagerComponents, init: ConnectionManagerInit = {}) {
    this.maxConnections = init.maxConnections ?? defaultOptions.maxConnections

    if (this.maxConnections < 1) {
      throw new InvalidParametersError('Connection Manager maxConnections must be greater than 0')
    }

    /**
     * Map of connections per peer
     */
    this.connections = new PeerMap()

    this.started = false
    this.peerId = components.peerId
    this.peerStore = components.peerStore
    this.metrics = components.metrics
    this.events = components.events
    this.log = components.logger.forComponent('libp2p:connection-manager')

    this.onConnect = this.onConnect.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)

    // allow/deny lists
    this.allow = (init.allow ?? []).map(str => multiaddrToIpNet(str))
    this.deny = (init.deny ?? []).map(str => multiaddrToIpNet(str))

    this.incomingPendingConnections = 0
    this.maxIncomingPendingConnections = init.maxIncomingPendingConnections ?? defaultOptions.maxIncomingPendingConnections
    this.outboundPendingConnections = 0

    // controls individual peers trying to dial us too quickly
    this.inboundConnectionRateLimiter = new RateLimiter({
      points: init.inboundConnectionThreshold ?? defaultOptions.inboundConnectionThreshold,
      duration: 1
    })

    // controls what happens when we have too many connections
    this.connectionPruner = new ConnectionPruner({
      connectionManager: this,
      peerStore: components.peerStore,
      events: components.events,
      logger: components.logger
    }, {
      allow: init.allow?.map(a => multiaddr(a))
    })

    this.dialQueue = new DialQueue(components, {
      addressSorter: init.addressSorter,
      maxParallelDials: init.maxParallelDials ?? MAX_PARALLEL_DIALS,
      maxDialQueueLength: init.maxDialQueueLength ?? MAX_DIAL_QUEUE_LENGTH,
      maxPeerAddrsToDial: init.maxPeerAddrsToDial ?? MAX_PEER_ADDRS_TO_DIAL,
      dialTimeout: init.dialTimeout ?? DIAL_TIMEOUT,
      resolvers: init.resolvers ?? {
        dnsaddr: dnsaddrResolver
      },
      connections: this.connections
    })

    this.reconnectQueue = new ReconnectQueue({
      events: components.events,
      peerStore: components.peerStore,
      logger: components.logger,
      connectionManager: this
    }, {
      retries: init.reconnectRetries,
      retryInterval: init.reconnectRetryInterval,
      backoffFactor: init.reconnectBackoffFactor,
      maxParallelReconnects: init.maxParallelReconnects
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/connection-manager'

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
          'inbound pending': this.incomingPendingConnections,
          outbound: 0,
          'outbound pending': this.outboundPendingConnections
        }

        for (const conns of this.connections.values()) {
          for (const conn of conns) {
            metric[conn.direction]++
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
              const key = `${stream.direction} ${stream.protocol ?? 'unnegotiated'}`

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
              const key = `${stream.direction} ${stream.protocol ?? 'unnegotiated'}`

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

    this.events.addEventListener('connection:open', this.onConnect)
    this.events.addEventListener('connection:close', this.onDisconnect)

    await start(
      this.dialQueue,
      this.reconnectQueue,
      this.connectionPruner
    )

    this.started = true
    this.log('started')
  }

  /**
   * Stops the Connection Manager
   */
  async stop (): Promise<void> {
    this.events.removeEventListener('connection:open', this.onConnect)
    this.events.removeEventListener('connection:close', this.onDisconnect)

    await stop(
      this.reconnectQueue,
      this.dialQueue,
      this.connectionPruner
    )

    // Close all connections we're tracking
    const tasks: Array<Promise<void>> = []
    for (const connectionList of this.connections.values()) {
      for (const connection of connectionList) {
        tasks.push((async () => {
          try {
            await connection.close()
          } catch (err) {
            this.log.error(err)
          }
        })())
      }
    }

    this.log('closing %d connections', tasks.length)
    await Promise.all(tasks)
    this.connections.clear()

    this.log('stopped')
  }

  getMaxConnections (): number {
    return this.maxConnections
  }

  setMaxConnections (maxConnections: number): void {
    if (this.maxConnections < 1) {
      throw new InvalidParametersError('Connection Manager maxConnections must be greater than 0')
    }

    let needsPrune = false

    if (maxConnections < this.maxConnections) {
      needsPrune = true
    }

    this.maxConnections = maxConnections

    if (needsPrune) {
      this.connectionPruner.maybePruneConnections()
    }
  }

  onConnect (evt: CustomEvent<Connection>): void {
    void this._onConnect(evt).catch(err => {
      this.log.error(err)
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

    if (connection.status !== 'open') {
      // this can happen when the remote closes the connection immediately after
      // opening
      return
    }

    const peerId = connection.remotePeer
    const isNewPeer = !this.connections.has(peerId)
    const storedConns = this.connections.get(peerId) ?? []
    storedConns.push(connection)

    this.connections.set(peerId, storedConns)

    // only need to store RSA public keys, all other types are embedded in the peer id
    if (peerId.publicKey != null && peerId.type === 'RSA') {
      await this.peerStore.patch(peerId, {
        publicKey: peerId.publicKey
      })
    }

    if (isNewPeer) {
      this.events.safeDispatchEvent('peer:connect', { detail: connection.remotePeer })
    }
  }

  /**
   * Removes the connection from tracking
   */
  onDisconnect (evt: CustomEvent<Connection>): void {
    const { detail: connection } = evt
    const peerId = connection.remotePeer
    const peerConns = this.connections.get(peerId) ?? []

    // remove closed connection
    const filteredPeerConns = peerConns.filter(conn => conn.id !== connection.id)

    // update peer connections
    this.connections.set(peerId, filteredPeerConns)

    if (filteredPeerConns.length === 0) {
      // trigger disconnect event if no connections remain
      this.log.trace('peer %p disconnected, removing connection map entry', peerId)
      this.connections.delete(peerId)

      // broadcast disconnect event
      this.events.safeDispatchEvent('peer:disconnect', { detail: connection.remotePeer })
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
    if (!this.started) {
      throw new NotStartedError('Not started')
    }

    this.outboundPendingConnections++

    try {
      options.signal?.throwIfAborted()

      const { peerId } = getPeerAddress(peerIdOrMultiaddr)

      if (this.peerId.equals(peerId)) {
        throw new InvalidPeerIdError('Can not dial self')
      }

      if (peerId != null && options.force !== true) {
        this.log('dial %p', peerId)
        const existingConnection = this.getConnections(peerId)
          .find(conn => conn.limits == null)

        if (existingConnection != null) {
          this.log('had an existing non-limited connection to %p as %a', peerId, existingConnection.remoteAddr)

          options.onProgress?.(new CustomProgressEvent('dial-queue:already-connected'))
          return existingConnection
        }
      }

      const connection = await this.dialQueue.dial(peerIdOrMultiaddr, {
        ...options,
        priority: options.priority ?? DEFAULT_DIAL_PRIORITY
      })

      if (connection.status !== 'open') {
        throw new ConnectionClosedError('Remote closed connection during opening')
      }

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

        // make sure we don't already have a connection to this multiaddr
        if (options.force !== true && conn.id !== connection.id && conn.remoteAddr.equals(connection.remoteAddr)) {
          connection.abort(new InvalidMultiaddrError('Duplicate multiaddr connection'))

          // return the existing connection
          return conn
        }
      }

      if (!trackedConnection) {
        peerConnections.push(connection)
      }

      return connection
    } finally {
      this.outboundPendingConnections--
    }
  }

  async closeConnections (peerId: PeerId, options: AbortOptions = {}): Promise<void> {
    const connections = this.connections.get(peerId) ?? []

    await Promise.all(
      connections.map(async connection => {
        try {
          await connection.close(options)
        } catch (err: any) {
          connection.abort(err)
        }
      })
    )
  }

  async acceptIncomingConnection (maConn: MultiaddrConnection): Promise<boolean> {
    // check deny list
    const denyConnection = this.deny.some(ma => {
      return ma.contains(maConn.remoteAddr.nodeAddress().address)
    })

    if (denyConnection) {
      this.log('connection from %a refused - connection remote address was in deny list', maConn.remoteAddr)
      return false
    }

    // check allow list
    const allowConnection = this.allow.some(ipNet => {
      return ipNet.contains(maConn.remoteAddr.nodeAddress().address)
    })

    if (allowConnection) {
      this.incomingPendingConnections++

      return true
    }

    // check pending connections
    if (this.incomingPendingConnections === this.maxIncomingPendingConnections) {
      this.log('connection from %a refused - incomingPendingConnections exceeded by host', maConn.remoteAddr)
      return false
    }

    if (maConn.remoteAddr.isThinWaistAddress()) {
      const host = maConn.remoteAddr.nodeAddress().address

      try {
        await this.inboundConnectionRateLimiter.consume(host, 1)
      } catch {
        this.log('connection from %a refused - inboundConnectionThreshold exceeded by host %s', maConn.remoteAddr, host)
        return false
      }
    }

    if (this.getConnections().length < this.maxConnections) {
      this.incomingPendingConnections++

      return true
    }

    this.log('connection from %a refused - maxConnections exceeded', maConn.remoteAddr)
    return false
  }

  afterUpgradeInbound (): void {
    this.incomingPendingConnections--
  }

  getDialQueue (): PendingDial[] {
    const statusMap: Record<JobStatus, PendingDialStatus> = {
      queued: 'queued',
      running: 'active',
      errored: 'error',
      complete: 'success'
    }

    return this.dialQueue.queue.queue.map(job => {
      return {
        id: job.id,
        status: statusMap[job.status],
        peerId: job.options.peerId,
        multiaddrs: [...job.options.multiaddrs].map(ma => multiaddr(ma))
      }
    })
  }

  async isDialable (multiaddr: Multiaddr | Multiaddr[], options: IsDialableOptions = {}): Promise<boolean> {
    return this.dialQueue.isDialable(multiaddr, options)
  }
}
