import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import mergeOptions from 'merge-options'
import { LatencyMonitor, SummaryObject } from './latency-monitor.js'
// @ts-expect-error retimer does not have types
import retimer from 'retimer'
import type { AbortOptions } from '@libp2p/interfaces'
import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import { trackedMap } from '@libp2p/tracked-map'
import { codes } from '../errors.js'
import { isPeerId, PeerId } from '@libp2p/interfaces/peer-id'
import { setMaxListeners } from 'events'
import type { Connection } from '@libp2p/interfaces/connection'
import type { ConnectionManager } from '@libp2p/interfaces/connection-manager'
import { Components, Initializable } from '@libp2p/interfaces/components'
import * as STATUS from '@libp2p/interfaces/connection/status'
import { Dialer } from './dialer/index.js'
import type { AddressSorter } from '@libp2p/interfaces/peer-store'
import type { Resolver } from '@multiformats/multiaddr'

const log = logger('libp2p:connection-manager')

const defaultOptions: Partial<ConnectionManagerInit> = {
  maxConnections: Infinity,
  minConnections: 0,
  maxData: Infinity,
  maxSentData: Infinity,
  maxReceivedData: Infinity,
  maxEventLoopDelay: Infinity,
  pollInterval: 2000,
  autoDialInterval: 10000,
  movingAverageInterval: 60000,
  defaultPeerValue: 0.5
}

const METRICS_COMPONENT = 'connection-manager'
const METRICS_PEER_CONNECTIONS = 'peer-connections'
const METRICS_PEER_VALUES = 'peer-values'

export interface ConnectionManagerInit {
  /**
   * The maximum number of connections to keep open
   */
  maxConnections: number

  /**
   * The minimum number of connections to keep open
   */
  minConnections: number

  /**
   * The max data (in and out), per average interval to allow
   */
  maxData?: number

  /**
   * The max outgoing data, per average interval to allow
   */
  maxSentData?: number

  /**
   * The max incoming data, per average interval to allow
   */
  maxReceivedData?: number

  /**
   * The upper limit the event loop can take to run
   */
  maxEventLoopDelay?: number

  /**
   * How often, in milliseconds, metrics and latency should be checked
   */
  pollInterval?: number

  /**
   * How often, in milliseconds, to compute averages
   */
  movingAverageInterval?: number

  /**
   * The value of the peer
   */
  defaultPeerValue?: number

  /**
   * If true, try to connect to all discovered peers up to the connection manager limit
   */
  autoDial?: boolean

  /**
   * How long to wait between attempting to keep our number of concurrent connections
   * above minConnections
   */
  autoDialInterval: number

  /**
   * Sort the known addresses of a peer before trying to dial
   */
  addressSorter?: AddressSorter

  /**
   * Number of max concurrent dials
   */
  maxParallelDials?: number

  /**
   * Number of max addresses to dial for a given peer
   */
  maxAddrsToDial?: number

  /**
   * How long a dial attempt is allowed to take
   */
  dialTimeout?: number

  /**
   * Number of max concurrent dials per peer
   */
  maxDialsPerPeer?: number

  /**
   * Multiaddr resolvers to use when dialing
   */
  resolvers?: Record<string, Resolver>
}

export interface ConnectionManagerEvents {
  'peer:connect': CustomEvent<PeerId>
  'peer:disconnect': CustomEvent<PeerId>
}

/**
 * Responsible for managing known connections.
 */
export class DefaultConnectionManager extends EventEmitter<ConnectionManagerEvents> implements ConnectionManager, Startable, Initializable {
  public readonly dialer: Dialer
  private components = new Components()
  private readonly opts: Required<ConnectionManagerInit>
  private readonly peerValues: Map<string, number>
  private readonly connections: Map<string, Connection[]>
  private started: boolean
  private timer?: ReturnType<retimer>
  private readonly latencyMonitor: LatencyMonitor

  constructor (init: ConnectionManagerInit) {
    super()

    this.opts = mergeOptions.call({ ignoreUndefined: true }, defaultOptions, init)

    if (this.opts.maxConnections < this.opts.minConnections) {
      throw errCode(new Error('Connection Manager maxConnections must be greater than minConnections'), codes.ERR_INVALID_PARAMETERS)
    }

    log('options: %o', this.opts)

    /**
     * Map of peer identifiers to their peer value for pruning connections.
     *
     * @type {Map<string, number>}
     */
    this.peerValues = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PEER_VALUES,
      metrics: this.components.getMetrics()
    })

    /**
     * Map of connections per peer
     */
    this.connections = trackedMap({
      component: METRICS_COMPONENT,
      metric: METRICS_PEER_CONNECTIONS,
      metrics: this.components.getMetrics()
    })

    this.started = false
    this._checkMetrics = this._checkMetrics.bind(this)

    this.latencyMonitor = new LatencyMonitor({
      latencyCheckIntervalMs: init.pollInterval,
      dataEmitIntervalMs: init.pollInterval
    })

    try {
      // This emitter gets listened to a lot
      setMaxListeners?.(Infinity, this)
    } catch {}

    this.dialer = new Dialer(this.opts)

    this.onConnect = this.onConnect.bind(this)
    this.onDisconnect = this.onDisconnect.bind(this)
  }

  init (components: Components): void {
    this.components = components

    this.dialer.init(components)
  }

  isStarted () {
    return this.started
  }

  /**
   * Starts the Connection Manager. If Metrics are not enabled on libp2p
   * only event loop and connection limits will be monitored.
   */
  async start () {
    if (this.components.getMetrics() != null) {
      this.timer = this.timer ?? retimer(this._checkMetrics, this.opts.pollInterval)
    }

    // latency monitor
    this.latencyMonitor.start()
    this._onLatencyMeasure = this._onLatencyMeasure.bind(this)
    this.latencyMonitor.addEventListener('data', this._onLatencyMeasure)
    await this.dialer.start()

    this.started = true
    log('started')
  }

  async afterStart () {
    this.components.getUpgrader().addEventListener('connection', this.onConnect)
    this.components.getUpgrader().addEventListener('connectionEnd', this.onDisconnect)
  }

  async beforeStop () {
    this.components.getUpgrader().removeEventListener('connection', this.onConnect)
    this.components.getUpgrader().removeEventListener('connectionEnd', this.onDisconnect)
  }

  /**
   * Stops the Connection Manager
   */
  async stop () {
    this.timer?.clear()

    this.latencyMonitor.removeEventListener('data', this._onLatencyMeasure)
    this.latencyMonitor.stop()
    await this.dialer.stop()

    this.started = false
    await this._close()
    log('stopped')
  }

  /**
   * Cleans up the connections
   */
  async _close () {
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
  }

  /**
   * Sets the value of the given peer. Peers with lower values
   * will be disconnected first.
   */
  setPeerValue (peerId: PeerId, value: number) {
    if (value < 0 || value > 1) {
      throw new Error('value should be a number between 0 and 1')
    }

    this.peerValues.set(peerId.toString(), value)
  }

  /**
   * Checks the libp2p metrics to determine if any values have exceeded
   * the configured maximums.
   *
   * @private
   */
  async _checkMetrics () {
    const metrics = this.components.getMetrics()

    if (metrics != null) {
      try {
        const movingAverages = metrics.getGlobal().getMovingAverages()
        const received = movingAverages.dataReceived[this.opts.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxReceivedData', received)
        const sent = movingAverages.dataSent[this.opts.movingAverageInterval].movingAverage
        await this._checkMaxLimit('maxSentData', sent)
        const total = received + sent
        await this._checkMaxLimit('maxData', total)
        log.trace('metrics update', total)
      } finally {
        this.timer = retimer(this._checkMetrics, this.opts.pollInterval)
      }
    }
  }

  onConnect (evt: CustomEvent<Connection>) {
    void this._onConnect(evt).catch(err => {
      log.error(err)
    })
  }

  /**
   * Tracks the incoming connection and check the connection limit
   */
  async _onConnect (evt: CustomEvent<Connection>) {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      await connection.close()
      return
    }

    const peerId = connection.remotePeer
    const peerIdStr = peerId.toString()
    const storedConns = this.connections.get(peerIdStr)

    if (storedConns != null) {
      storedConns.push(connection)
    } else {
      this.connections.set(peerIdStr, [connection])
    }

    if (peerId.publicKey != null) {
      await this.components.getPeerStore().keyBook.set(peerId, peerId.publicKey)
    }

    if (!this.peerValues.has(peerIdStr)) {
      this.peerValues.set(peerIdStr, this.opts.defaultPeerValue)
    }

    const numConnections = this.getConnections().length
    const toPrune = numConnections - this.opts.maxConnections

    await this._checkMaxLimit('maxConnections', numConnections, toPrune)
    this.dispatchEvent(new CustomEvent<Connection>('peer:connect', { detail: connection }))
  }

  /**
   * Removes the connection from tracking
   */
  onDisconnect (evt: CustomEvent<Connection>) {
    const { detail: connection } = evt

    if (!this.started) {
      // This can happen when we are in the process of shutting down the node
      return
    }

    const peerId = connection.remotePeer.toString()
    let storedConn = this.connections.get(peerId)

    if (storedConn != null && storedConn.length > 1) {
      storedConn = storedConn.filter((conn) => conn.id !== connection.id)
      this.connections.set(peerId, storedConn)
    } else if (storedConn != null) {
      this.connections.delete(peerId)
      this.peerValues.delete(connection.remotePeer.toString())
      this.dispatchEvent(new CustomEvent<Connection>('peer:disconnect', { detail: connection }))

      this.components.getMetrics()?.onPeerDisconnected(connection.remotePeer)
    }
  }

  getConnections (peerId?: PeerId): Connection[] {
    if (peerId != null) {
      return this.connections.get(peerId.toString()) ?? []
    }

    let conns: Connection[] = []

    for (const c of this.connections.values()) {
      conns = conns.concat(c)
    }

    return conns
  }

  async openConnection (peerId: PeerId, options?: AbortOptions): Promise<Connection> {
    log('dial to %p', peerId)
    const existingConnections = this.getConnections(peerId)

    if (existingConnections.length > 0) {
      log('had an existing connection to %p', peerId)

      return existingConnections[0]
    }

    const connection = await this.dialer.dial(peerId, options)
    let peerConnections = this.connections.get(peerId.toString())

    if (peerConnections == null) {
      peerConnections = []
      this.connections.set(peerId.toString(), peerConnections)
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
    const connections = this.connections.get(peerId.toString()) ?? []

    await Promise.all(
      connections.map(async connection => {
        return await connection.close()
      })
    )
  }

  /**
   * Get all open connections with a peer
   */
  getAll (peerId: PeerId): Connection[] {
    if (!isPeerId(peerId)) {
      throw errCode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toString()
    const connections = this.connections.get(id)

    // Return all open connections
    if (connections != null) {
      return connections.filter(connection => connection.stat.status === STATUS.OPEN)
    }

    return []
  }

  /**
   * If the event loop is slow, maybe close a connection
   */
  _onLatencyMeasure (evt: CustomEvent<SummaryObject>) {
    const { detail: summary } = evt

    this._checkMaxLimit('maxEventLoopDelay', summary.avgMs, 1)
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * If the `value` of `name` has exceeded its limit, maybe close a connection
   */
  async _checkMaxLimit (name: keyof ConnectionManagerInit, value: number, toPrune: number = 1) {
    const limit = this.opts[name]
    log.trace('checking limit of %s. current value: %d of %d', name, value, limit)
    if (value > limit) {
      log('%s: limit exceeded: %p, %d, pruning %d connection(s)', this.components.getPeerId(), name, value, toPrune)
      await this._maybePruneConnections(toPrune)
    }
  }

  /**
   * If we have more connections than our maximum, select some excess connections
   * to prune based on peer value
   */
  async _maybePruneConnections (toPrune: number) {
    const connections = this.getConnections()

    if (connections.length <= this.opts.minConnections || toPrune < 1) {
      return
    }

    const peerValues = Array.from(new Map([...this.peerValues.entries()].sort((a, b) => a[1] - b[1])))
    log.trace('sorted peer values: %j', peerValues)

    const toClose = []

    for (const [peerId] of peerValues) {
      log('too many connections open - closing a connection to %p', peerId)

      for (const connection of connections) {
        if (connection.remotePeer.toString() === peerId) {
          toClose.push(connection)
        }

        if (toClose.length === toPrune) {
          break
        }
      }
    }

    // close connections
    await Promise.all(
      toClose.map(async connection => {
        try {
          await connection.close()
        } catch (err) {
          log.error(err)
        }

        // TODO: should not need to invoke this manually
        this.onDisconnect(new CustomEvent<Connection>('connectionEnd', {
          detail: connection
        }))
      })
    )
  }
}
